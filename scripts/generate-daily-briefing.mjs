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

STANDING POLICY (docs/CONTENT_ACCURACY.md): website content must be VALID and ACCURATE.
Wrong figures, wrong-year sources, or hrefs that do not support the claimed number are
worse than a shorter briefing. Prefer omit over invent. Do not publish until the accuracy
gate passes.

1. Run the full daily-financial-briefing skill pipeline under .cursor/skills/financial-research/
   (gather → global → China → signals → suggestions → report). Coverage: last 24h
   (72h if weekend/Monday). Use dated sources only — verify **calendar year**, not just
   month-day. Prefer primary sources for official data (BLS, Fed, US Treasury yield curve,
   PBOC, NBS, company IR). Use Yahoo Finance for US index/quote checks only (secondary).
   For China, always sweep 华尔街见闻 (wallstreetcn.com), Caixin/财新 or 第一财经/Yicai,
   and BlockBeats/律动 (theblockbeats.info) and cite at least one item from each desk
   family in the China section when they have coverage-window news.

2. Pre-publish accuracy gate (ALL required):
   (a) each index move is that index's official close;
   (b) inflation/jobs/GDP beat|miss is vs consensus not vs prior — cooler CPI = miss;
   (c) PBOC OMO net injection = ops − maturity with 亿元 correctly converted
       (100亿元 = CNY10bn);
   (d) gold/oil levels are settles or explicitly labeled spot;
   (e) every hard quote's source page year matches the coverage window — reject stale
       aggregator flashes (e.g. BlockBeats "7月15日" BTC $116k in a 2026 briefing);
   (f) 华尔街见闻 / wallstreetcn.com: do not cite month-day-only A/H or Fed wraps for
       index closes or speeches — require explicit calendar year on the page or confirm
       vs primary/tier-2 same-day tape; treat IDs near rejected 2025 wraps (3751205,
       3751275) as suspect; prefer 京报网 / The Standard / SED / NY Fed / BLS for closes;
   (g) crypto prints triangulated: BlockBeats alone is not enough for BTC/ETH levels —
       pair with dated Cointelegraph/CoinDesk/Yahoo (or similar);
   (h) every sourced-fact href opens to a page that supports the claimed number;
   (i) optional figures[] values must match sourced facts in the same briefing.

3. Write web/content/briefings/${today}.md using the exact YAML frontmatter schema in
   web/content/briefings/2026-07-16.md when present (else 2026-07-15.md). All keys required,
   INCLUDING assetFramework, publishedAt as ISO UTC now, keySources, AND per-fact source
   buttons: summary/globalChanged/chinaChanged entries should be objects
   { text, sources: [{ label, href }] } pointing at the original primary post (BLS/Fed/
   Treasury/NBS/PBOC/ASML IR/华尔街见闻/Caixin/Yicai/etc). assetFramework is the stable
   per-asset regime lens in
   .cursor/skills/financial-research/interpreting-market-signals/references/asset-framework.md;
   cover all eight canonical assets: US equities, US 10y, DXY, gold, oil, China equities,
   CNY, BTC). Cite sources on hard numbers. If a figure cannot be verified, omit it and
   note any rejected bad cites in singleSource/caveats.
   If today's file already exists, update it with the latest developments instead of skipping.

4. From web/, run: npm ci && npm run sync-data && npm run scan-links
   so public JSON updates and the site-wide accuracy scanner passes. scan-links
   walks EVERY href in briefing YAML and web/src, fetches each cited article,
   and checks that claim numbers appear on the cited page(s) — not one section,
   and not denylist-only. If it fails, fix the cite or the claim text (prefer
   omit over invent), append newly discovered bad IDs to
   web/scripts/rejected-source-ids.json, and re-run until green. Do not push
   a failing scan.

5. Commit on main with message: content: publish ${today} daily briefing
   Include web/content/briefings/${today}.md, web/public/data/**, and any
   rejected-source-ids.json updates. Push to origin main.

6. Reply with DONE ${today} and the commit SHA. If the accuracy gate or scan-links
   failed on any item, say what was rejected and why.

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
