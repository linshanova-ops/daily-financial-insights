/**
 * Push IMAP inbox captures to briefing/${date} BEFORE the cloud agent starts.
 *
 * The agent clones from GitHub — runner-local fetch writes are invisible unless
 * committed. Without this, reformatted inbox on main shadows raw 今日图表.
 *
 * Critical: fetch-inbox writes last-fetch.json (and captures) as dirty worktree
 * files. Switching to briefing/${date} must preserve those bytes across checkout.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasBloombergChartOfDay,
  parseBloombergSections,
} from "./inbox-bloomberg-sections.mjs";
import { INBOX_LAST_FETCH_REL } from "./load-inbox-context.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

function git(args, { allowFail = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0 && !allowFail) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed: ${err}`);
  }
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function ensureGitIdentity() {
  const name = git(["config", "user.name"], { allowFail: true }).stdout;
  const email = git(["config", "user.email"], { allowFail: true }).stdout;
  if (!name) git(["config", "user.name", "syravocado-bot"]);
  if (!email) git(["config", "user.email", "syravocado-bot@users.noreply.github.com"]);
}

/** @param {string[]} rels */
export function snapshotWorkspaceFiles(rels) {
  /** @type {Map<string, Buffer>} */
  const snap = new Map();
  for (const rel of rels) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      snap.set(rel, fs.readFileSync(abs));
    }
  }
  return snap;
}

/** @param {Map<string, Buffer>} snap */
export function restoreWorkspaceFiles(snap) {
  for (const [rel, buf] of snap) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
  }
}

/**
 * Drop local modifications / untracked collisions for paths we already
 * snapshotted, so `git checkout` of the briefing branch cannot abort.
 * @param {string[]} rels
 */
function clearPathsForCheckout(rels) {
  for (const rel of rels) {
    // Tracked modifications: restore index/HEAD version temporarily.
    git(["restore", "--worktree", "--staged", "--source=HEAD", "--", rel], {
      allowFail: true,
    });
    // Older git / missing restore: fall back.
    git(["checkout", "HEAD", "--", rel], { allowFail: true });
    const abs = path.join(root, rel);
    // Untracked file that would still block checkout onto a tracked path:
    // remove worktree copy; snapshot already holds bytes.
    if (fs.existsSync(abs)) {
      const tracked = git(["ls-files", "--", rel], { allowFail: true });
      if (!tracked.stdout) {
        fs.rmSync(abs, { force: true });
      }
    }
  }
}

/**
 * @param {string} briefingDate
 * @param {{ path: string, body: string, sourceId: string }[]} inboxItems
 * @returns {{ pushed: boolean, branch: string, chartOfDay: boolean }}
 */
export function commitInboxCapturesToBriefingBranch(briefingDate, inboxItems) {
  const branch = `briefing/${briefingDate}`;
  const rels = [];
  for (const item of inboxItems || []) {
    if (item?.path) rels.push(item.path);
  }
  if (fs.existsSync(path.join(root, INBOX_LAST_FETCH_REL))) {
    rels.push(INBOX_LAST_FETCH_REL);
  }
  const unique = [...new Set(rels)].filter((rel) =>
    fs.existsSync(path.join(root, rel)),
  );

  // Also stage any 今日图表 image files written by fetch.
  const chartDir = path.join(root, "web/public/inbox-charts");
  if (fs.existsSync(chartDir)) {
    for (const name of fs.readdirSync(chartDir)) {
      if (/^bloomberg-.*\.(png|jpe?g|webp|gif)$/i.test(name)) {
        unique.push(`web/public/inbox-charts/${name}`);
      }
    }
  }

  let chartOfDay = false;
  for (const item of inboxItems || []) {
    if (item.sourceId !== "bloomberg-markets-daily-china") continue;
    chartOfDay = hasBloombergChartOfDay(item.body);
    const sections = parseBloombergSections(item.body);
    const chart = sections.find((s) => s.chartOfDay);
    console.log(
      `[inbox-commit] bloomberg chars=${item.body.length} chartOfDay=${chartOfDay} sections=${sections.map((s) => s.id).join(",") || "(none)"}`,
    );
    if (chart) {
      console.log(
        `[inbox-commit] 今日图表 preview: ${chart.body.slice(0, 240).replace(/\s+/g, " ")}`,
      );
    }
  }

  if (!unique.length) {
    console.log("[inbox-commit] no inbox files on disk — skip push");
    return { pushed: false, branch, chartOfDay };
  }

  ensureGitIdentity();
  git(["fetch", "origin", "main", branch], { allowFail: true });

  // Preserve runner-local IMAP captures across the branch switch. Without this,
  // dirty last-fetch.json / capture md files abort checkout (workflow failure).
  const snap = snapshotWorkspaceFiles(unique);
  clearPathsForCheckout(unique);

  const localBranch = git(["rev-parse", "--verify", branch], { allowFail: true });
  if (localBranch.status === 0) {
    git(["checkout", branch]);
    git(["merge", "origin/main", "-m", `merge main into ${branch}`], {
      allowFail: true,
    });
  } else {
    const remoteBranch = git(["rev-parse", "--verify", `origin/${branch}`], {
      allowFail: true,
    });
    if (remoteBranch.status === 0) {
      git(["checkout", "-B", branch, `origin/${branch}`]);
      git(["merge", "origin/main", "-m", `merge main into ${branch}`], {
        allowFail: true,
      });
    } else {
      git(["checkout", "-B", branch, "origin/main"]);
    }
  }

  // Restore the exact capture bytes from this workflow run.
  restoreWorkspaceFiles(snap);

  // Re-write inbox markdown from the in-memory snapshot (fetch may be newer).
  for (const item of inboxItems || []) {
    if (!item?.path || !item.body) continue;
    const abs = path.join(root, item.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      item.body.endsWith("\n") ? item.body : `${item.body}\n`,
    );
  }

  git(["add", "--", ...unique]);
  const staged = git(["diff", "--cached", "--name-only"], { allowFail: true });
  if (!staged.stdout) {
    console.log(`[inbox-commit] ${branch}: nothing new to commit`);
    git(["checkout", "-"], { allowFail: true });
    return { pushed: false, branch, chartOfDay };
  }

  git([
    "commit",
    "-m",
    `chore: sync IMAP inbox captures for ${briefingDate}`,
  ]);
  const push = git(["push", "-u", "origin", branch], { allowFail: true });
  if (push.status !== 0) {
    console.warn(
      `[inbox-commit] push failed: ${push.stderr || push.stdout} — trying force-with-lease`,
    );
    git(["push", "--force-with-lease", "-u", "origin", branch]);
  }
  console.log(`[inbox-commit] pushed inbox to origin/${branch}`);
  git(["checkout", "-"], { allowFail: true });
  return { pushed: true, branch, chartOfDay };
}
