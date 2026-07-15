/**
 * Kicks a Cursor cloud agent that runs the daily-financial-briefing pipeline,
 * writes web/content/briefings/YYYY-MM-DD.md, syncs JSON, and pushes to main.
 *
 * Requires: CURSOR_API_KEY
 */
import { Agent, CursorAgentError } from "@cursor/sdk";

const apiKey = process.env.CURSOR_API_KEY;
const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";

if (!apiKey) {
  console.error("Missing CURSOR_API_KEY");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

const prompt = `You are publishing syravocado's daily financial briefing for ${today}.

ACCURACY IS NON-NEGOTIABLE. Wrong figures or wrong beat/miss labels are worse than a shorter briefing.

1. Run the full daily-financial-briefing skill pipeline under .cursor/skills/financial-research/
   (gather → global → China → signals → suggestions → report). Coverage: last 24h
   (72h if weekend/Monday). Use dated sources only. Prefer primary sources for official
   data (BLS, Fed, PBOC, NBS, company IR). For China, always sweep 华尔街见闻
   (wallstreetcn.com) and BlockBeats/律动 (theblockbeats.info) and cite at least one
   item from each in the China section when they have coverage-window news.

2. Before writing, verify: (a) each index move is that index's official close;
   (b) inflation/jobs/GDP beat|miss is vs consensus not vs prior — cooler CPI = miss;
   (c) PBOC OMO net injection = ops − maturity with 亿元 correctly converted
   (100亿元 = CNY10bn); (d) gold/oil levels are settles or explicitly labeled spot.

3. Write web/content/briefings/${today}.md using the exact YAML frontmatter schema in
   web/content/briefings/2026-07-14.md (all keys required, INCLUDING assetFramework —
   the stable per-asset regime lens described in
   .cursor/skills/financial-research/interpreting-market-signals/references/asset-framework.md;
   cover all eight canonical assets: US equities, US 10y, DXY, gold, oil, China equities,
   CNY, BTC). Cite sources on hard numbers.
   If today's file already exists, update it with the latest developments instead of skipping.

4. From web/, run: npm ci && npm run sync-data
   so web/public/data/index.json, latest.json, and briefings/${today}.json update.

5. Commit on main with message: content: publish ${today} daily briefing
   Include web/content/briefings/${today}.md and web/public/data/**
   Push to origin main.

6. Reply with DONE ${today} and the commit SHA.

Do not open a PR — push to main so GitHub Pages redeploys automatically.`;

async function disposeAgent(agent) {
  if (!agent) return;
  try {
    if (typeof agent[Symbol.asyncDispose] === "function") {
      await agent[Symbol.asyncDispose]();
      return;
    }
    if (typeof agent.close === "function") {
      agent.close();
    }
  } catch (err) {
    console.warn(`[briefing] dispose warning: ${err?.message ?? err}`);
  }
}

async function main() {
  // Current @cursor/sdk: Agent.create(...) returns a Promise<SDKAgent>.
  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: false,
      skipReviewerRequest: true,
      workOnCurrentBranch: true,
    },
  });

  try {
    console.log(`[briefing] agent=${agent.agentId}`);
    console.log(`[briefing] track: https://cursor.com/agents/${agent.agentId}`);

    const run = await agent.send(prompt);
    console.log(`[briefing] run=${run.id}`);

    for await (const event of run.stream()) {
      if (event.type === "status") console.log(`[briefing] ${event.status}`);
      if (event.type === "tool_call" && event.status !== "running") {
        console.log(`[briefing] tool: ${event.name} -> ${event.status}`);
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(`[briefing] ended as ${result.status}`);
      if (result.result) console.error(`[briefing] result: ${result.result}`);
      process.exit(2);
    }

    console.log(`[briefing] finished in ${result.durationMs}ms`);
  } catch (err) {
    console.error(`[briefing] error name=${err?.name}`);
    console.error(`[briefing] error message=${err?.message}`);
    if (err instanceof CursorAgentError) {
      process.exit(err.isRetryable ? 75 : 1);
    }
    process.exit(1);
  } finally {
    await disposeAgent(agent);
  }
}

main();
