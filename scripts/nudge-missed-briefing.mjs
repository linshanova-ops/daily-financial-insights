/**
 * Weekday 09:00 miss catch-up. Does not turn on idle Agent.create.
 *
 * If today's briefing is missing: resume-cap is 1 RUNNING agent, so a leftover
 * chat kills the dashboard cron. Wait ~90m (leftover may self-publish), then
 * archive this-repo leftover and Agent.create a weekday run.
 */
import { spawnSync } from "node:child_process";
import {
  beijingDateString,
  isBeijingWeekendDate,
} from "./lib/briefing-slot-gate.mjs";
import {
  agentId,
  pickCatchupAction,
} from "./lib/pick-catchup-action.mjs";

const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const repoNeedle =
  process.env.BRIEFING_REPO_NEEDLE || "daily-financial-insights";
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const today = process.env.BRIEFING_DATE || beijingDateString();
const slotStartMs = Date.parse(`${today}T01:00:00.000Z`); // Beijing 09:00

function gh(args, { allowFail = false } = {}) {
  const env = { ...process.env };
  if (githubToken) {
    env.GH_TOKEN = githubToken;
    env.GITHUB_TOKEN = githubToken;
  }
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    env,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFail) {
    throw new Error(`gh ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function briefingExistsOnMain() {
  const repoPath = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  const res = gh(
    ["api", `repos/${repoPath}/contents/web/content/briefings/${today}.md?ref=main`],
    { allowFail: true },
  );
  return res.status === 0;
}

function weekdayPrompt() {
  return `Follow \`.cursor/skills/weekday-website-update/SKILL.md\` (full pipeline) and \`/ponytail\` for code.
Beijing date ${today}. git fetch origin main; if web/content/briefings/${today}.md is already on origin/main, stop.
This is a GitHub catch-up because the 09:00 Cursor Automation missed (usually a leftover RUNNING agent occupying the concurrent cap). Publish ${today}, merge when the Briefing accuracy gate is green, confirm live Pages data/latest.json date is ${today}, then stop/archive.
Do not call generate-daily-briefing.mjs. Sat/Sun: stop.`;
}

async function disposeAgent(agent) {
  if (!agent) return;
  try {
    if (typeof agent[Symbol.asyncDispose] === "function") {
      await agent[Symbol.asyncDispose]();
      return;
    }
    if (typeof agent.close === "function") agent.close();
  } catch (err) {
    console.warn(`[catchup] dispose warning: ${err?.message ?? err}`);
  }
}

async function runAgentPrompt(agent, prompt) {
  const run = await agent.send(prompt);
  console.log(`[catchup] run=${run.id} https://cursor.com/agents/${agent.agentId}`);
  for await (const event of run.stream()) {
    if (event.type === "status") console.log(`[catchup] ${event.status}`);
  }
  const result = await run.wait();
  if (result.status !== "finished") {
    throw new Error(`agent run ended as ${result.status}: ${result.result ?? ""}`);
  }
  return result;
}

async function main() {
  if (isBeijingWeekendDate(today)) {
    console.log(`[catchup] weekend skip beijing=${today}`);
    return;
  }
  if (briefingExistsOnMain()) {
    console.log(`[catchup] ${today}.md already on main — nothing to do`);
    return;
  }

  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.warn(
      "::warning::Missing CURSOR_API_KEY — cannot catch up a missed 09:00. Add the repo secret.",
    );
    return;
  }

  const { Agent } = await import("@cursor/sdk");
  const listed = await Agent.list({ runtime: "cloud", apiKey, limit: 50 });
  const decision = pickCatchupAction(listed.items || [], {
    repoNeedle,
    slotStartMs,
    nowMs: Date.now(),
  });
  const id = decision.agent ? agentId(decision.agent) : "";
  console.log(`[catchup] action=${decision.action} agent=${id || "-"} beijing=${today}`);

  if (decision.action === "wait") {
    console.log(
      `[catchup] cap occupied by ${id || "an agent"} — leftover may still self-publish; retry later`,
    );
    return;
  }
  if (decision.action === "blocked") {
    console.error(
      `[catchup] cap occupied by another repo's agent ${id}. Not archiving. Live site stays stale.`,
    );
    process.exit(1);
  }

  if (decision.action === "archive-and-create" && id) {
    // ponytail: archive leftover after 90m; per-account locks if Cursor raises the cap
    console.warn(`[catchup] archiving leftover ${id} so weekday publish can start`);
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
  try {
    console.log(`[catchup] created ${agent.agentId}`);
    await runAgentPrompt(agent, weekdayPrompt());
    if (!briefingExistsOnMain()) {
      console.error(`[catchup] agent finished but ${today}.md is still missing on main`);
      process.exit(4);
    }
    console.log(`[catchup] DONE ${today}`);
  } finally {
    await disposeAgent(agent);
  }
}

main().catch((err) => {
  console.error(`[catchup] ${err?.message || err}`);
  process.exit(1);
});
