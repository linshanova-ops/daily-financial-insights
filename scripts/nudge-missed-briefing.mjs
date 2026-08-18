/**
 * If 09:00 missed and $TODAY.md is missing: archive leftover holding the cap, start one weekday agent.
 */
import { spawnSync } from "node:child_process";
import {
  beijingDateString,
  isBeijingWeekendDate,
} from "./lib/briefing-slot-gate.mjs";
import { agentId, catchupAction } from "./lib/pick-catchup-action.mjs";

const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const today = process.env.BRIEFING_DATE || beijingDateString();
const slotStartMs = Date.parse(`${today}T01:00:00.000Z`); // Beijing 09:00

function briefingExistsOnMain() {
  const repoPath = repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  const env = { ...process.env };
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    env.GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    env.GITHUB_TOKEN = env.GH_TOKEN;
  }
  return (
    spawnSync(
      "gh",
      ["api", `repos/${repoPath}/contents/web/content/briefings/${today}.md?ref=main`],
      { encoding: "utf8", env },
    ).status === 0
  );
}

async function main() {
  if (isBeijingWeekendDate(today)) {
    console.log(`[catchup] weekend skip beijing=${today}`);
    return;
  }
  if (briefingExistsOnMain()) {
    console.log(`[catchup] ${today}.md already on main`);
    return;
  }
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.warn("::warning::Missing CURSOR_API_KEY — add the repo secret.");
    return;
  }

  const { Agent } = await import("@cursor/sdk");
  const listed = await Agent.list({ runtime: "cloud", apiKey, limit: 50 });
  const decision = catchupAction(listed.items || [], slotStartMs);
  const id = agentId(decision.agent);
  console.log(`[catchup] action=${decision.action} agent=${id || "-"} beijing=${today}`);

  if (decision.action === "skip") return;

  if (decision.action === "archive" && id) {
    // ponytail: archive leftover; raise Cursor cap if this fights a real chat too often
    console.warn(`[catchup] archiving leftover ${id}`);
    await Agent.archive(id, { apiKey });
    await new Promise((r) => setTimeout(r, 5000));
  }

  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: true,
      skipReviewerRequest: true,
    },
  });
  const run = await agent.send(
    `Follow \`.cursor/skills/weekday-website-update/SKILL.md\`. Beijing date ${today}. If web/content/briefings/${today}.md is already on origin/main, stop. Publish ${today}, merge when Briefing accuracy gate is green, confirm live Pages data/latest.json date, then stop. Do not call generate-daily-briefing.mjs.`,
  );
  console.log(`[catchup] started ${agent.agentId} run=${run.id} https://cursor.com/agents/${agent.agentId}`);
}

main().catch((err) => {
  console.error(`[catchup] ${err?.message || err}`);
  process.exit(1);
});
