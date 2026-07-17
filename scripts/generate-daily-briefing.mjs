/**
 * Kicks a Cursor cloud agent that drafts today's briefing on a PR branch.
 * Fail-closed publish:
 *   1) Agent opens PR (never pushes to main)
 *   2) GitHub CI runs scan-links (briefing-accuracy.yml)
 *   3) If green → auto-merge
 *   4) If red → agent rewrites (up to MAX_FIX_ATTEMPTS) → re-check → merge
 *
 * Requires: CURSOR_API_KEY
 * Optional: GITHUB_TOKEN / GH_TOKEN (Actions provides GITHUB_TOKEN) for PR merge
 */
import { spawnSync } from "node:child_process";
import { Agent, CursorAgentError } from "@cursor/sdk";

const apiKey = process.env.CURSOR_API_KEY;
const repoUrl =
  process.env.REPO_URL ??
  "https://github.com/linshanova-ops/daily-financial-insights";
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const MAX_FIX_ATTEMPTS = 3;
const CHECK_POLL_MS = 20_000;
const CHECK_TIMEOUT_MS = 20 * 60_000;

if (!apiKey) {
  console.error("Missing CURSOR_API_KEY");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const branchName = `briefing/${today}`;
const prTitle = `[skip netlify] content: publish ${today} daily briefing`;

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
  return `You are drafting syravocado's daily financial briefing for ${today}.

STANDING POLICY (docs/CONTENT_ACCURACY.md): website content must be VALID and ACCURATE.
Wrong figures, wrong-year sources, or hrefs that do not support the claimed number are
worse than a shorter briefing. Prefer omit over invent.

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
   If today's file already exists, update it with the latest developments instead of skipping.

4. From web/, run: npm ci && npm run sync-data && npm run scan-links
   Fix until scan-links is green before you finish. Append newly discovered bad IDs to
   web/scripts/rejected-source-ids.json when needed.

5. Commit on \`${branchName}\` with message: content: publish ${today} daily briefing
   Include web/content/briefings/${today}.md, web/public/data/**, and any
   rejected-source-ids.json updates. Push the branch and open/update the PR to main
   with title: ${prTitle}

6. Reply with: DONE ${today} BRANCH=${branchName} PR=<url-or-number>
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

async function waitForChecks(prNumber) {
  const started = Date.now();
  while (Date.now() - started < CHECK_TIMEOUT_MS) {
    const view = gh(
      [
        "pr",
        "view",
        String(prNumber),
        "--json",
        "statusCheckRollup,mergeStateStatus,state",
      ],
      { allowFail: true },
    );
    if (view.status !== 0) {
      await sleep(CHECK_POLL_MS);
      continue;
    }
    const data = JSON.parse(view.stdout || "{}");
    if (data.state && data.state !== "OPEN") {
      return { state: "closed", failingLog: `PR state=${data.state}` };
    }
    const checks = Array.isArray(data.statusCheckRollup)
      ? data.statusCheckRollup
      : [];
    // Ignore Netlify canceled/neutral noise; require GitHub Actions accuracy gate.
    const actionable = checks.filter((c) => {
      const name = `${c.name || ""} ${c.context || ""}`;
      if (/netlify/i.test(name)) return false;
      return true;
    });

    if (!actionable.length) {
      console.log("[briefing] waiting for CI checks to start…");
      await sleep(CHECK_POLL_MS);
      continue;
    }

    const pending = actionable.filter((c) => {
      const status = (c.status || c.state || "").toUpperCase();
      return (
        status === "PENDING" ||
        status === "QUEUED" ||
        status === "IN_PROGRESS" ||
        status === "WAITING" ||
        status === "REQUESTED" ||
        (!c.conclusion && status !== "COMPLETED")
      );
    });
    const failing = actionable.filter((c) => {
      const conclusion = (c.conclusion || "").toUpperCase();
      return (
        conclusion === "FAILURE" ||
        conclusion === "CANCELLED" ||
        conclusion === "TIMED_OUT" ||
        conclusion === "ACTION_REQUIRED" ||
        conclusion === "STARTUP_FAILURE" ||
        conclusion === "ERROR" ||
        conclusion === "FAIL"
      );
    });
    const allSuccess = actionable.every((c) => {
      const conclusion = (c.conclusion || "").toUpperCase();
      const status = (c.status || "").toUpperCase();
      return (
        conclusion === "SUCCESS" ||
        conclusion === "NEUTRAL" ||
        conclusion === "SKIPPED" ||
        (status === "COMPLETED" &&
          (conclusion === "SUCCESS" ||
            conclusion === "NEUTRAL" ||
            conclusion === "SKIPPED"))
      );
    });

    console.log(
      `[briefing] checks: ${actionable.length} actionable, ${pending.length} pending, ${failing.length} failing`,
    );

    if (failing.length) {
      return {
        state: "failure",
        failingLog: formatFailingChecks(prNumber, failing),
      };
    }
    if (!pending.length && allSuccess) {
      return { state: "success", failingLog: "" };
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

function mergePr(prNumber) {
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
  if (merged.status !== 0) {
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
    if (auto.status !== 0) {
      throw new Error(
        `merge failed: ${merged.stderr || merged.stdout}\n${auto.stderr || auto.stdout}`,
      );
    }
    console.log(`[briefing] auto-merge enabled for PR #${prNumber}`);
    return;
  }
  console.log(`[briefing] merged PR #${prNumber}`);
}

/**
 * Merges via GITHUB_TOKEN do not trigger other push workflows (GitHub recursion
 * guard). Explicitly dispatch Pages deploy so the live site updates.
 */
function triggerPagesDeploy() {
  const dispatched = gh(
    [
      "workflow",
      "run",
      "Deploy syravocado to GitHub Pages",
      "--ref",
      "main",
    ],
    { allowFail: true },
  );
  if (dispatched.status === 0) {
    console.log("[briefing] dispatched Pages deploy workflow");
    return;
  }
  // Fallback: repository_dispatch (also allowed to start workflows from GITHUB_TOKEN).
  const repoPath = repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  const api = gh(
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
  if (api.status === 0) {
    console.log("[briefing] dispatched deploy-pages repository_dispatch");
    return;
  }
  console.error(
    `[briefing] WARNING: could not trigger Pages deploy. Merge is on main; run Deploy manually.\n${dispatched.stderr || dispatched.stdout}\n${api.stderr || api.stdout}`,
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

    for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
      console.log(`[briefing] CI wait attempt ${attempt}/${MAX_FIX_ATTEMPTS}`);
      const check = await waitForChecks(pr.number);
      if (check.state === "success") {
        mergePr(pr.number);
        triggerPagesDeploy();
        console.log(`[briefing] DONE ${today} merged via PR #${pr.number}`);
        return;
      }

      console.error(`[briefing] CI ${check.state}`);
      if (attempt === MAX_FIX_ATTEMPTS) {
        console.error(
          `[briefing] still failing after ${MAX_FIX_ATTEMPTS} attempts. PR left open; live site unchanged.`,
        );
        console.error(check.failingLog.slice(0, 4000));
        process.exit(4);
      }

      console.log("[briefing] asking agent to rewrite for CI failures…");
      await runAgentPrompt(agent, buildFixPrompt(check.failingLog || check.state));
      // Re-resolve PR in case number stayed the same
      pr = findBriefingPr() || pr;
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
