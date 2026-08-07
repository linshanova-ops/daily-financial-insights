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
 * Requires: CURSOR_API_KEY (when auto generate is enabled)
 * Optional: GITHUB_TOKEN / GH_TOKEN (Actions provides GITHUB_TOKEN) for PR merge
 *
 * Token budget: prompt is inbox-first + short checklist. Ops file can disable
 * Agent.create entirely (manual publish mode).
 */
import { spawnSync } from "node:child_process";
import {
  evaluatePrPublishState,
  filterActionableChecks,
  isFailingCheck,
} from "./lib/briefing-publish-helpers.mjs";
import { beijingDateString, isBeijingPostWeekendOpen } from "./lib/briefing-slot-gate.mjs";
import { commitInboxCapturesToBriefingBranch } from "./lib/commit-inbox-for-briefing.mjs";
import {
  isCursorUsageLimitError,
  markUsageLimitSkip,
} from "./lib/cursor-usage-limit.mjs";
import { loadBriefingOps } from "./lib/briefing-ops.mjs";
import {
  formatInboxPromptBlock,
  loadInboxFetchStatus,
  loadInboxForBriefing,
} from "./lib/load-inbox-context.mjs";
import { hasBloombergChartOfDay } from "./lib/inbox-bloomberg-sections.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const forceCursor =
  process.env.BRIEFING_FORCE_CURSOR === "true" ||
  process.env.BRIEFING_FORCE_CURSOR === "1";

// Hard stop when ops say manual-only (saves Cursor tokens) — before SDK import.
{
  const ops = loadBriefingOps();
  if (!ops.cursorAutoGenerate && !forceCursor) {
    console.warn(
      `::warning::Skipping Agent.create — ${ops.reason}. Set BRIEFING_FORCE_CURSOR=1 to override.`,
    );
    process.exit(0);
  }
}

const { Agent, CursorAgentError } = await import("@cursor/sdk");

const apiKey = process.env.CURSOR_API_KEY;
const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const MAX_FIX_ATTEMPTS = 1;
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
      ? "MORNING (Beijing 08:00)"
      : slotId === "evening"
        ? "EVENING (Beijing 20:00) — update same-day file if morning exists"
        : "MANUAL / catch-up";
  const postWeekend = isBeijingPostWeekendOpen(today);
  const coverage = postWeekend
    ? "Coverage: since Friday US cash close (~72h), include weekend crypto/geo."
    : "Coverage: last ~24–36h.";

  // Token-light: inbox-first merge. Do NOT run the full gather skill unless inbox missing.
  return `Draft syravocado briefing for ${today}. Slot: ${slotLabel}. ${coverage}

TOKEN BUDGET (critical): Prefer inbox merge + a few primary corroborations. Do NOT run the full daily-financial-briefing gather skill unless inbox is empty. Do NOT re-read long prior briefings end-to-end — clone YAML keys from the latest file under web/content/briefings/ and rewrite content.

Standing accuracy (docs/CONTENT_ACCURACY.md): omit unverifiable numbers; 10亿元=CNY1bn; beat/miss vs estimate only; label dates must match URL /YYYY/MM/DD/; crypto needs ≥2 dated sources; never invent tape (inject marketDashboard).

Theme cards (required — docs/superpowers/specs/2026-08-06-module-source-depth-design.md): themeCards[] of 3–5 is the ONLY full narrative of each core story (fact → mechanism → trigger → invalidator → horizon → status → grade → optional assets/factSources). One event → one theme card. Skim/summary may list short titles that match theme titles (UI anchors to #theme-{id}); Global/China stay spine facts (Bloomberg); Signals stay compact grade/evidence pointers — NEVER paste the same wording across modules.

Event Calendar (required — docs/superpowers/specs/2026-08-06-event-calendar-design.md; fixtures: docs/superpowers/specs/2026-08-07-calendar-gov-earnings-design.md): eventCalendar with windowStart=briefing date and windowEnd=next Friday after the Friday-on-or-after that date (Beijing; e.g. Thu Aug 6 → Aug 14). Keep ~8–20 vital dated rows (compact) when fixtures exist. Read committed web/content/calendar/gov-fixtures.json and web/content/calendar/earnings-fixtures.json. Coverage spine when in-window: US/China/Japan data+CB+key tech/AI earnings+IPOs; US TIC + quarterly refunding; UK/EU = central-bank only (no UK/EU economic data). Taiwan/HK prints → region China (not Other). Prefer IMAP 日程/央行动态 then fixtures for gaps through windowEnd. Earnings only from fixtures/watchlist — never invent dates/consensus. Optional themeId chip only (no why/trigger/invalidator). Do NOT emit narrative watchItems for new briefings (legacy field may stay empty array if schema requires).

Assets by class (required): assetClasses in order us-equities · china-hk-equities · rates · fx · commodities · crypto. Currencies are FX instrument rows, not top-level peers. Prefer themeId chips over rewriting Themes.

Fail-closed: branch \`${branchName}\`, PR title exactly \`${prTitle}\`, never push/merge main. CI runs verify-briefing.

Steps:
1) Merge IMAP inbox on this branch (already fetched). Section map — 国际要闻→globalChanged (1 Chinese bullet each); 大中华新闻→chinaChanged (1 Chinese bullet each); 市场一览→marketOverview.items; 日程+央行动态→eventCalendar.events (dated); 今日图表→figures id=bloomberg-chart-of-day kind=insight (open chartImage PNG first; analysis must describe the chart metric/levels — never "image saved / no caption"). Glassnode Insights (weekly, when captured): use email body only (never fetch "Read full report"); add 1 sourced globalChanged on-chain line + signals when clearly supported; optional figures[] id=glassnode-weekly. Cite stable Bloomberg Asia href only for newsletter; Glassnode newsletter landing for weekly. Attach stronger primaries when available.
2) Light web corroboration only for hard US closes / oil settles / China official prints missing from inbox; fill eventCalendar fixtures (TIC/refunding/CB/data) when dated in window.
3) Write web/content/briefings/${today}.md (all schema keys; themeCards×3–5; eventCalendar; assetClasses×6; sourced summary/globalChanged/chinaChanged; publishedAt=now UTC). Keep inbox/** bytes unchanged; keep inbox-charts/**.
4) From web/: node scripts/fetch-market-closes.mjs --inject content/briefings/${today}.md
5) From web/: npm ci && npm run verify-briefing — fix until green; commit md+JSON together.
6) Push \`${branchName}\`, open/update PR. Reply: DONE ${today} BRANCH=${branchName} PR=<url>

${formatInboxPromptBlock(inboxItems, inboxFetchStatus)}`;
}

function buildFixPrompt(ciLog) {
  return `CI failed for ${today} on \`${branchName}\`. Fix cites/claims so verify-briefing passes; push same branch; do not merge main.

CI log:
\`\`\`
${ciLog.slice(0, 4000)}
\`\`\`
Omit unverifiable numbers. Reply: FIXED ${today} BRANCH=${branchName} PR=<url>`;
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
  // Push runner-local IMAP captures to the briefing branch so the cloud agent
  // clones raw 今日图表 instead of a stale reformatted file from main.
  const inboxPush = commitInboxCapturesToBriefingBranch(today, inboxItems);
  const startingRef = inboxPush.pushed ? inboxPush.branch : "main";
  if (inboxPush.chartOfDay) {
    console.log("[briefing] 今日图表 detected in IMAP capture — agent must add insight figure");
  } else {
    const bloomberg = inboxItems.find(
      (i) => i.sourceId === "bloomberg-markets-daily-china",
    );
    if (bloomberg) {
      console.log(
        `[briefing] no 今日图表 header in bloomberg capture (${bloomberg.body.length} chars)`,
      );
      console.log(
        `[briefing] bloomberg hasChart=${hasBloombergChartOfDay(bloomberg.body)}`,
      );
    }
  }

  const agent = await Agent.create({
    apiKey,
    model: { id: "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef }],
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
    // Spend-limit / usage-limit is an account billing state, not a content bug.
    // Soft-skip (exit 0) so external cron catch-up every 5m does not paint the
    // Actions UI red for hours. A skip marker arms the workflow cache so later
    // ticks in this slot do not keep calling Agent.create.
    if (isCursorUsageLimitError(err)) {
      const skipDir =
        process.env.CURSOR_USAGE_SKIP_DIR ||
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          ".cache",
          "cursor-usage-skip",
        );
      try {
        markUsageLimitSkip(skipDir, String(err?.message || "usage_limit_exceeded"));
      } catch (markErr) {
        console.warn(
          `[briefing] could not write usage-limit skip marker: ${markErr?.message || markErr}`,
        );
      }
      console.warn(
        "::warning::Cursor usage limit exceeded — skipping generate (soft). Enable usage-based pricing / raise Spend Limit at https://www.cursor.com/dashboard?tab=settings. Catch-up ticks will no-op for this slot until the limit is restored and the skip cache expires.",
      );
      process.exit(0);
    }
    if (err instanceof CursorAgentError) {
      process.exit(err.isRetryable ? 75 : 1);
    }
    process.exit(1);
  } finally {
    await disposeAgent(agent);
  }
}

main();
