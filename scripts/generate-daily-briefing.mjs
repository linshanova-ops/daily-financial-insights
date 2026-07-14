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

const prompt = `You are publishing linshanova's daily financial briefing for ${today}.

1. Run the full daily-financial-briefing skill pipeline under .cursor/skills/financial-research/
   (gather → global → China → signals → suggestions → report). Coverage: last 24h
   (72h if weekend/Monday). Use dated sources only.

2. Write web/content/briefings/${today}.md using the exact YAML frontmatter schema in
   web/content/briefings/2026-07-13.md (all keys required).

3. From web/, run: npm ci && npm run sync-data
   so web/public/data/index.json, latest.json, and briefings/${today}.json update.

4. Commit on main with message: content: publish ${today} daily briefing
   Include web/content/briefings/${today}.md and web/public/data/**
   Push to origin main.

5. Reply with DONE ${today} and the commit SHA.

Do not open a PR — push to main so GitHub Pages redeploys automatically.`;

async function main() {
  const agent = Agent.create({
    apiKey,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: "main" }],
      autoCreatePR: false,
      skipReviewerRequest: true,
    },
  });

  try {
    const run = await agent.send(prompt);
    console.log(`[briefing] agent=${agent.agentId} run=${run.id}`);
    console.log(`[briefing] track: https://cursor.com/agents/${agent.agentId}`);

    for await (const event of run.stream()) {
      if (event.type === "status") console.log(`[briefing] ${event.status}`);
      if (event.type === "tool_call" && event.status !== "running") {
        console.log(`[briefing] tool: ${event.name} -> ${event.status}`);
      }
    }

    const result = await run.wait();
    if (result.status !== "finished") {
      console.error(`[briefing] ended as ${result.status}`);
      process.exit(2);
    }

    console.log(`[briefing] finished in ${result.durationMs}ms`);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`[briefing] failed: ${err.message}`);
      process.exit(err.isRetryable ? 75 : 1);
    }
    throw err;
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

main();
