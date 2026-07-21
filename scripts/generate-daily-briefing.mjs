/**
 * Kicks a Cursor cloud agent that drafts today's briefing on a PR branch.
 * Fail-closed publish:
 *   1) Agent opens PR (never pushes to main)
 *   2) Orchestrator marks the PR ready (Cursor autoCreatePR opens drafts;
 *      draft PRs often never get CI — that was the stuck-loop root cause)
 *   3) GitHub CI runs scan-links (briefing-accuracy.yml)
 *   4) If green → auto-merge
 *   5) If red → agent rewrites (up to MAX_FIX_ATTEMPTS) → re-check → merge
 *   6) If PR is already MERGED (overlapping run won) → treat as success
 *
 * Requires: CURSOR_API_KEY
 * Optional: GITHUB_TOKEN / GH_TOKEN (Actions provides GITHUB_TOKEN) for PR merge
 */
import { spawnSync } from "node:child_process";
import { Agent, CursorAgentError } from "@cursor/sdk";
import {
  evaluatePrPublishState,
  filterActionableChecks,
  isFailingCheck,
} from "./lib/briefing-publish-helpers.mjs";
import { beijingDateString } from "./lib/briefing-slot-gate.mjs";
import {
  formatInboxPromptBlock,
  loadInboxFetchStatus,
  loadInboxForBriefing,
} from "./lib/load-inbox-context.mjs";

const apiKey = process.env.CURSOR_API_KEY;
const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const MAX_FIX_ATTEMPTS = 3;
const CHECK_POLL_MS = 20_000;
const CHECK_TIMEOUT_MS = 20 * 60_000;
/** Fail faster when CI never queues (usually still-draft / workflow skip). */
const CHECK_START_TIMEOUT_MS = 8 * 60_000;

if (!apiKey) {
  console.error("Missing CURSOR_API_KEY");
  process.exit(1);
}

// Beijing calendar date (slot gate may start ~20m before 08:00, still UTC prior day).
const today = process.env.BRIEFING_DATE || beijingDateString();
/** @type {'morning'|'evening'|''} */
const slotId = process.env.BRIEFING_SLOT_ID === "evening"
  ? "evening"
  : process.env.BRIEFING_SLOT_ID === "morning"
    ? "morning"
    : "";
const branchName = `briefing/${today}`;
const prTitle = `[skip netlify] content: publish ${today} daily briefing`;
console.log(`[briefing] briefingDate=${today} (Asia/Shanghai) slot=${slotId || "manual"}`);

const inboxItems = loadInboxForBriefing(today);
const inboxFetchStatus = loadInboxFetchStatus();
console.log(
  `[briefing] inbox sources: ${inboxItems.map((i) => i.sourceId).join(", ") || "(none)"}`,
);
if (inboxFetchStatus) {
  console.log(
    `[briefing] inbox fetch: ok=${inboxFetchStatus.ok} reason=${inboxFetchStatus.reason || "-"}`,
  );
}

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
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`gh ${args.join(" ")} failed: ${err}`);
  }
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function buildPublishPrompt() {
  const slotLabel =
    slotId === "morning"
      ? "MORNING slot (Beijing 08:00) — first publish of the day when possible"
      : slotId === "evening"
        ? "EVENING slot (Beijing 20:00) — REQUIRED same-day refresh even if morning already published"
        : "MANUAL / catch-up run";

  return `You are drafting syravocado's daily financial briefing for ${today}.

STANDING POLICY (docs/CONTENT_ACCURACY.md): website content must be VALID and ACCURATE.
Wrong figures, wrong-year sources, or hrefs that do not support the claimed number are
worse than a shorter briefing. Prefer omit over invent.

PUBLISH SLOT: ${slotLabel}
- Always set publishedAt to ISO UTC now.
- Re-run Market Dashboard inject every time (fresh closes).
- If web/content/briefings/${today}.md already exists: UPDATE it (do not skip).
  Evening runs must merge any new inbox mail and refresh narrative for the China session.
- Accuracy gate must pass before you finish.

FAIL-CLOSED PUBLISH (critical):
- Work on git branch \`${branchName}\` (create/reset from latest main).
- Open a pull request INTO main. Do NOT push to main. Do NOT merge the PR.
- PR title MUST be exactly: ${prTitle}
- The GitHub Action "Briefing accuracy gate" will run npm run scan-links.
  An orchestrator will auto-merge only when CI is green, or ask you to rewrite if red.

1. Run the full daily-financial-briefing skill pipeline under .cursor/skills/financial-research/
   (gather → global → China → signals → suggestions → report). Coverage: last 24h
   (72h if weekend/Monday). Use dated sources only — verify **calendar year**, not just
   month-day. Prefer primary sources for official data (BLS, Fed, US Treasury yield curve,
   PBOC, NBS, company IR). Use Yahoo Finance for US index/quote checks only (secondary).
   For China, always sweep 华尔街见闻 (wallstreetcn.com), Caixin/财新 or 第一财经/Yicai,
   and BlockBeats/律动 (theblockbeats.info) and cite at least one item from each desk
   family in the China section when they have coverage-window news.

   FRESHNESS (critical for ${today}):
   - Lead with sources dated **${today}** (Asia desks / same-day prints) and the prior
     US cash session when this is the morning slot — not last Friday as the spine.
   - At least ~70% of keySources must be dated inside the last ~36h of the coverage
     window (72h only on weekend/Monday open). Older cites are background only.
   - Every keySources label must include an explicit calendar date in-window.
   - Do not recycle prior-briefing narratives unless re-confirmed with a fresh href today.

   INBOX NEWSLETTERS (Gmail IMAP — already fetched when present):
   - 彭博 Markets Daily China / 财经早茶 (daily): merge into China / Global / Assets / Watch
     (section map when labeled; otherwise use Chinese bullets carefully).
     **Keep Chinese text Chinese** for bullets whose primary cite is this newsletter.
     Do NOT use 全球市况 tape to replace Market Dashboard numbers.
     **今日图表 (REQUIRED when present in inbox):** add a figures[] entry
     \`id: bloomberg-chart-of-day\`, \`kind: insight\`, with \`title\` + required
     \`analysis\` (one clear so-what). Keep Chinese if the section is Chinese.
     Optional \`display\`/\`delta\` only when a hard number is stated — never invent.
   - Glassnode Insights / Week on Chain (weekly, usually Tuesday): merge into crypto
     assetFramework / signals / watch when on-chain color is relevant.
     Ignore webinar / "Now live" promos (fetcher already drops them).
   - Cite policy: use ONLY the stable href given for each inbox source (never tracking
     links from the email). When an inbox source is used, also list it in keySources.
   - Evening backfill: if web/content/briefings/${today}.md already exists AND inbox
     captures are new/updated this run, UPDATE that briefing to merge the new inbox
     material — do not skip just because the file exists.
   - If inbox fetch failed, note briefly in caveats/singleSource; do not invent mail.
   ${formatInboxPromptBlock(inboxItems, inboxFetchStatus)}
   If inbox files exist under web/content/inbox/ (including last-fetch.json), include
   them in the PR commit for audit.
   Do NOT rewrite or reformat web/content/inbox/** bodies — commit the IMAP capture
   bytes as fetched (so 今日图表 and other sections stay intact for the next run).

2. Pre-publish accuracy gate (ALL required):
   (a) each index move is that index's official close;
   (b) beat|miss is vs estimate only — cooler/less than estimate = "miss estimate";
       hotter/more than estimate = "beat estimate" (CPI, jobs, GDP, claims — never swap tone for label);
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
   { text, sources: [{ label, href }] } pointing at the original primary post.
   assetFramework covers all eight canonical assets. If a figure cannot be verified, omit
   it and note rejected bad cites in singleSource/caveats.
   figures[] may include kind: stat | bars | insight. When inbox has 今日图表, include
   kind: insight (id bloomberg-chart-of-day) with analysis.
   If today's file already exists, update it with the latest developments instead of skipping.

4. Market Dashboard (required): from web/, run
   \`node scripts/fetch-market-closes.mjs --inject content/briefings/${today}.md\`
   This fetches real closes (Yahoo / U.S. Treasury / CoinGecko / OKX) into frontmatter
   \`marketDashboard\`. Do NOT invent tape levels by hand. Do NOT delete the injected block.
   If a single row fails, the script omits it — that is OK.

5. From web/, run: npm ci && npm run sync-data && npm run scan-links
   Fix until scan-links is green before you finish. Append newly discovered bad IDs to
   web/scripts/rejected-source-ids.json when needed.

6. Commit on \`${branchName}\` with message: content: publish ${today} daily briefing
   Include web/content/briefings/${today}.md, web/public/data/**, any new
   web/content/inbox/** captures, and any rejected-source-ids.json updates.
   Push the branch and open/update the PR to main
   with title: ${prTitle}

7. Reply with: DONE ${today} BRANCH=${branchName} PR=<url-or-number>
   Do not merge. Do not push to main.`;
}

function buildFixPrompt(ciLog) {
  return `The pull request for ${today} failed the Briefing accuracy gate CI.

Branch: ${branchName}
You must REWRITE the briefing/cites so \`npm run scan-links\` passes, then push to the SAME branch (update the existing PR). Do NOT push to main. Do NOT merge.

CI failure output:
\`\`\`
${ciLog.slice(0, 12000)}
\`\`\`

Requirements:
1. From web/: npm ci && npm run sync-data && npm run scan-links — must be green.
2. Prefer omit unverifiable figures over inventing. Fix wrong-year / unsupported hrefs.
3. Commit and push to \`${branchName}\`.
4. Reply with: FIXED ${today} BRANCH=${branchName} PR=<url-or-number>`;
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
    console.warn(`[briefing] dispose warning: ${err?.message ?? err}`);
  }
}

async function runAgentPrompt(agent, prompt) {
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
    throw new Error(`agent run ended as ${result.status}: ${result.result ?? ""}`);
  }
  console.log(`[briefing] finished in ${result.durationMs}ms`);
  return result;
}

function findBriefingPr() {
  const byHead = gh(
    [
      "pr",
      "list",
      "--state",
      "open",
      "--head",
      branchName,
      "--json",
      "number,url,title,headRefName",
    ],
    { allowFail: true },
  );
  if (byHead.status === 0 && byHead.stdout) {
    const rows = JSON.parse(byHead.stdout);
    if (rows[0]) return rows[0];
  }

  const bySearch = gh(
    [
      "pr",
      "list",
      "--state",
      "open",
      "--search",
      `head:${branchName} OR "${today} daily briefing"`,
      "--json",
      "number,url,title,headRefName",
      "--limit",
      "10",
    ],
    { allowFail: true },
  );
  if (bySearch.status === 0 && bySearch.stdout) {
    const rows = JSON.parse(bySearch.stdout);
    const match =
      rows.find((r) => r.headRefName === branchName) ||
      rows.find((r) => (r.title || "").includes(today));
    if (match) return match;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cursor cloud autoCreatePR opens drafts. Mark ready BEFORE waiting on CI —
 * otherwise checks may never start and the orchestrator loops until timeout.
 */
function ensurePrReady(prNumber) {
  const view = gh(
    ["pr", "view", String(prNumber), "--json", "isDraft,state"],
    { allowFail: true },
  );
  if (view.status === 0 && view.stdout) {
    try {
      const data = JSON.parse(view.stdout);
      if (data.state === "MERGED") {
        console.log(`[briefing] PR #${prNumber} already merged`);
        return "merged";
      }
      if (data.state && data.state !== "OPEN") {
        console.log(`[briefing] PR #${prNumber} state=${data.state}`);
        return "closed";
      }
      if (data.isDraft === false) {
        return "ready";
      }
    } catch {
      /* fall through to gh pr ready */
    }
  }
  const ready = gh(["pr", "ready", String(prNumber)], { allowFail: true });
  if (ready.status === 0) {
    console.log(`[briefing] marked PR #${prNumber} ready for review (pre-CI)`);
    return "ready";
  }
  console.warn(
    `[briefing] could not mark PR #${prNumber} ready: ${ready.stderr || ready.stdout}`,
  );
  return "unknown";
}

async function waitForChecks(prNumber) {
  const started = Date.now();
  let sawActionable = false;
  let lastReadyNudge = 0;
  while (Date.now() - started < CHECK_TIMEOUT_MS) {
    // Re-nudge draft → ready while CI has not appeared (every ~2 min).
    if (!sawActionable && Date.now() - lastReadyNudge > 120_000) {
      const readyState = ensurePrReady(prNumber);
      lastReadyNudge = Date.now();
      if (readyState === "merged") {
        return { state: "success", failingLog: "" };
      }
      if (readyState === "closed") {
        return { state: "closed", failingLog: `PR #${prNumber} closed` };
      }
    }

    const view = gh(
      [
        "pr",
        "view",
        String(prNumber),
        "--json",
        "statusCheckRollup,mergeStateStatus,state,isDraft",
      ],
      { allowFail: true },
    );
    if (view.status !== 0) {
      await sleep(CHECK_POLL_MS);
      continue;
    }
    const data = JSON.parse(view.stdout || "{}");
    const evaluated = evaluatePrPublishState({
      prState: data.state,
      checks: data.statusCheckRollup,
    });

    if (evaluated.state === "success") {
      if (String(data.state || "").toUpperCase() === "MERGED") {
        console.log(`[briefing] PR #${prNumber} already merged — done`);
      }
      return { state: "success", failingLog: "" };
    }
    if (evaluated.state === "closed") {
      return { state: "closed", failingLog: `PR state=${data.state}` };
    }
    if (evaluated.state === "failure") {
      const failing = filterActionableChecks(data.statusCheckRollup).filter(
        isFailingCheck,
      );
      return {
        state: "failure",
        failingLog: formatFailingChecks(prNumber, failing),
      };
    }

    if (evaluated.actionable > 0) {
      sawActionable = true;
      console.log(
        `[briefing] checks: ${evaluated.actionable} actionable, ${evaluated.pending} pending, ${evaluated.failing} failing` +
          (data.isDraft ? " (still draft!)" : ""),
      );
    } else {
      console.log(
        `[briefing] waiting for CI checks to start…` +
          (data.isDraft ? " PR is still draft" : ""),
      );
      if (Date.now() - started >= CHECK_START_TIMEOUT_MS) {
        return {
          state: "timeout",
          failingLog:
            "Timed out waiting for CI checks to start. PR may still be draft or workflows did not queue.",
        };
      }
    }
    await sleep(CHECK_POLL_MS);
  }
  return { state: "timeout", failingLog: "Timed out waiting for CI checks" };
}

function formatFailingChecks(prNumber, failing) {
  const lines = failing.map(
    (c) => `- ${c.name || c.context || "check"}: ${c.conclusion || c.state}`,
  );
  const logs = gh(
    [
      "pr",
      "checks",
      String(prNumber),
      "--watch=false",
    ],
    { allowFail: true },
  );
  // Try to pull failed job logs from the accuracy workflow
  const failedRun = gh(
    [
      "run",
      "list",
      "--branch",
      branchName,
      "--workflow",
      "briefing-accuracy.yml",
      "--limit",
      "1",
      "--json",
      "databaseId,conclusion,url",
    ],
    { allowFail: true },
  );
  let runLog = "";
  if (failedRun.status === 0 && failedRun.stdout) {
    try {
      const runs = JSON.parse(failedRun.stdout);
      if (runs[0]?.databaseId) {
        const log = gh(
          ["run", "view", String(runs[0].databaseId), "--log-failed"],
          { allowFail: true },
        );
        runLog = log.stdout || log.stderr || "";
      }
    } catch {
      /* ignore */
    }
  }
  return [
    lines.join("\n"),
    logs.stdout || logs.stderr || "",
    runLog,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function prState(prNumber) {
  const view = gh(
    ["pr", "view", String(prNumber), "--json", "state"],
    { allowFail: true },
  );
  if (view.status !== 0 || !view.stdout) return "";
  try {
    return String(JSON.parse(view.stdout).state || "");
  } catch {
    return "";
  }
}

function mergeAlreadyDone(prNumber, ...messages) {
  if (prState(prNumber) === "MERGED") return true;
  const blob = messages.join("\n").toLowerCase();
  return blob.includes("already merged") || blob.includes("pull request is merged");
}

function mergePr(prNumber) {
  // Belt-and-suspenders: ready was requested before CI wait, but re-check.
  const readyState = ensurePrReady(prNumber);
  if (readyState === "merged" || prState(prNumber) === "MERGED") {
    console.log(`[briefing] PR #${prNumber} already merged`);
    return;
  }

  // Waited for green checks already — merge immediately (fail-closed gate).
  const merged = gh(
    [
      "pr",
      "merge",
      String(prNumber),
      "--squash",
      "--delete-branch",
    ],
    { allowFail: true },
  );
  if (merged.status === 0) {
    console.log(`[briefing] merged PR #${prNumber}`);
    return;
  }
  if (mergeAlreadyDone(prNumber, merged.stderr, merged.stdout)) {
    console.log(`[briefing] PR #${prNumber} already merged`);
    return;
  }

  // Fallback: enable auto-merge in case of brief race with required checks.
  const auto = gh(
    [
      "pr",
      "merge",
      String(prNumber),
      "--auto",
      "--squash",
      "--delete-branch",
    ],
    { allowFail: true },
  );
  if (auto.status === 0) {
    console.log(`[briefing] auto-merge enabled for PR #${prNumber}`);
    return;
  }
  if (mergeAlreadyDone(prNumber, auto.stderr, auto.stdout)) {
    console.log(`[briefing] PR #${prNumber} already merged`);
    return;
  }
  throw new Error(
    `merge failed: ${merged.stderr || merged.stdout}\n${auto.stderr || auto.stdout}`,
  );
}

/** True when today's briefing markdown is already on main (another run won). */
function briefingExistsOnMain() {
  const repoPath = repoUrl
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  const res = gh(
    [
      "api",
      `repos/${repoPath}/contents/web/content/briefings/${today}.md?ref=main`,
    ],
    { allowFail: true },
  );
  return res.status === 0;
}

/**
 * Merges via GITHUB_TOKEN do not trigger other push workflows (GitHub recursion
 * guard). Explicitly dispatch Pages deploy so the live site updates.
 * Retries because a missed dispatch leaves the site stale after a green merge.
 */
function triggerPagesDeploy() {
  const attempts = [
    () =>
      gh(
        [
          "workflow",
          "run",
          "Deploy syravocado to GitHub Pages",
          "--ref",
          "main",
        ],
        { allowFail: true },
      ),
    () => {
      const repoPath = repoUrl
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "");
      return gh(
        [
          "api",
          "-X",
          "POST",
          `repos/${repoPath}/dispatches`,
          "-f",
          "event_type=deploy-pages",
        ],
        { allowFail: true },
      );
    },
  ];

  const errors = [];
  for (let round = 0; round < 3; round++) {
    for (const attempt of attempts) {
      const res = attempt();
      if (res.status === 0) {
        console.log(
          `[briefing] dispatched Pages deploy (round ${round + 1})`,
        );
        return;
      }
      errors.push(res.stderr || res.stdout || `status=${res.status}`);
    }
    // Brief pause before retry
    spawnSync("sleep", [String(2 * (round + 1))], { stdio: "ignore" });
  }
  throw new Error(
    `Pages deploy dispatch failed after retries — live site may stay stale.\n${errors.join("\n")}`,
  );
}

async function main() {
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
    console.log(`[briefing] agent=${agent.agentId}`);
    console.log(`[briefing] track: https://cursor.com/agents/${agent.agentId}`);
    console.log(`[briefing] fail-closed branch=${branchName}`);

    await runAgentPrompt(agent, buildPublishPrompt());

    let pr = null;
    for (let i = 0; i < 12 && !pr; i++) {
      pr = findBriefingPr();
      if (pr) break;
      console.log("[briefing] waiting for PR to appear…");
      await sleep(10_000);
    }
    if (!pr) {
      console.error(
        `[briefing] no open PR found for branch ${branchName}. Live site unchanged.`,
      );
      process.exit(3);
    }
    console.log(`[briefing] PR #${pr.number} ${pr.url}`);

    // Critical: leave draft before any CI wait (see ensurePrReady docs).
    const initialReady = ensurePrReady(pr.number);
    if (initialReady === "merged") {
      triggerPagesDeploy();
      console.log(
        `[briefing] DONE ${today} already merged via PR #${pr.number}`,
      );
      return;
    }
    if (initialReady === "closed") {
      if (briefingExistsOnMain()) {
        triggerPagesDeploy();
        console.log(
          `[briefing] DONE ${today} — PR closed but briefing already on main`,
        );
        return;
      }
      console.error(
        `[briefing] PR #${pr.number} closed before CI. Live site unchanged.`,
      );
      process.exit(3);
    }

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      console.log(`[briefing] CI wait attempt ${attempt}/${MAX_FIX_ATTEMPTS}`);
      const check = await waitForChecks(pr.number);
      if (check.state === "success") {
        // Re-resolve: overlapping run may have merged already.
        if (prState(pr.number) !== "MERGED") {
          mergePr(pr.number);
        }
        triggerPagesDeploy();
        console.log(`[briefing] DONE ${today} merged via PR #${pr.number}`);
        return;
      }

      if (check.state === "closed") {
        if (briefingExistsOnMain()) {
          triggerPagesDeploy();
          console.log(
            `[briefing] DONE ${today} — PR closed but briefing already on main`,
          );
          return;
        }
        console.error(
          `[briefing] PR closed during CI wait. Live site unchanged.`,
        );
        process.exit(3);
      }

      console.error(`[briefing] CI ${check.state}`);
      if (attempt === MAX_FIX_ATTEMPTS) {
        console.error(
          `[briefing] still failing after ${MAX_FIX_ATTEMPTS} attempts. PR left open; live site unchanged.`,
        );
        console.error(check.failingLog.slice(0, 4000));
        process.exit(4);
      }

      // Only ask the agent to rewrite on real CI failures, not start-timeouts
      // from a still-draft PR — re-ready and retry first.
      if (check.state === "timeout") {
        console.log("[briefing] re-marking PR ready after CI start timeout…");
        ensurePrReady(pr.number);
        await sleep(15_000);
        continue;
      }

      console.log("[briefing] asking agent to rewrite for CI failures…");
      await runAgentPrompt(agent, buildFixPrompt(check.failingLog || check.state));
      // Re-resolve PR in case number stayed the same
      pr = findBriefingPr() || pr;
      ensurePrReady(pr.number);
      await sleep(15_000); // let CI queue
    }
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
