/**
 * If $TODAY.md is missing: send the weekday prompt to the leftover holding
 * the cap, or create if the cap is free. 09:00 inbox-sync sets
 * CATCHUP_CREATE=0 (dashboard automation is the clock). 09:30 catch-up may create.
 */
import { spawnSync } from "node:child_process";
import {
  beijingDateString,
  isBeijingWeekendDate,
} from "./lib/briefing-slot-gate.mjs";
import {
  agentId,
  catchupAction,
  listRows,
  ours,
} from "./lib/pick-catchup-action.mjs";

const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const today = process.env.BRIEFING_DATE || beijingDateString();
const slotStartMs = Date.parse(`${today}T01:00:00.000Z`); // Beijing 09:00
const weekdayPrompt = `Follow \`.cursor/skills/weekday-website-update/SKILL.md\`. Beijing date ${today}. $TODAY.md on main is not done: if 今日图表 / 市场一览 / Themes still yesterday, patch and rewrite Themes from today’s 财经早茶. Stop only when those sections match that mail. Publish ${today}, merge when Briefing accuracy gate is green, confirm live Pages data/latest.json date, then stop. Do not call generate-daily-briefing.mjs.`;

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

function isCapError(err) {
  const s = `${err?.code || ""} ${err?.message || err}`;
  return /resource_exhausted|rate-limited|too many concurrent/i.test(s);
}

function isBusyError(err) {
  const s = `${err?.code || ""} ${err?.name || ""} ${err?.message || err}`;
  return /agent_busy|agentbusy|agent is busy/i.test(s);
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
  const rows = listRows(listed);
  const decision = catchupAction(rows, slotStartMs);
  const id = agentId(decision.agent);
  console.log(`[catchup] action=${decision.action} agent=${id || "-"} beijing=${today}`);

  if (decision.action === "skip") return;

  async function sendTo(lid, why) {
    const agent = Agent.resume(lid, { apiKey, model: { id: "composer-2" } });
    try {
      const run = await agent.send(weekdayPrompt);
      console.log(`[catchup] ${why} leftover ${lid} run=${run.id} https://cursor.com/agents/${lid}`);
    } catch (err) {
      // Leftover is mid-turn (occupying the cap). It publishes; do not fail the job.
      if (isBusyError(err)) {
        console.log(`[catchup] leftover busy — already working ${lid}`);
        return;
      }
      throw err;
    }
  }

  if (decision.action === "send") {
    await sendTo(id, "sent");
    return;
  }

  if (process.env.CATCHUP_CREATE === "0") {
    console.log("[catchup] create skipped (Cursor 09:00 automation is the clock)");
    return;
  }

  try {
    const agent = await Agent.create({
      apiKey,
      model: { id: "composer-2" },
      cloud: {
        repos: [{ url: repoUrl, startingRef: "main" }],
        autoCreatePR: true,
        skipReviewerRequest: true,
      },
    });
    const run = await agent.send(weekdayPrompt);
    console.log(`[catchup] started ${agent.agentId} run=${run.id} https://cursor.com/agents/${agent.agentId}`);
  } catch (err) {
    if (!isCapError(err)) throw err;
    const leftover = ours(rows)[0];
    const lid = agentId(leftover);
    if (!lid) throw err;
    console.warn(`[catchup] create cap-full; sending to leftover ${lid}`);
    await sendTo(lid, "sent");
  }
}

main().catch((err) => {
  console.error(`[catchup] ${err?.message || err}`);
  process.exit(1);
});
