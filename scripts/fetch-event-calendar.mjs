#!/usr/bin/env node
/**
 * Fetch Event Calendar fixtures (gov + earnings) into web/content/calendar/.
 *
 * Usage:
 *   node scripts/fetch-event-calendar.mjs
 *   node scripts/fetch-event-calendar.mjs --date 2026-08-07
 *   node scripts/fetch-event-calendar.mjs --date 2026-08-07 --dry-run
 *   node scripts/fetch-event-calendar.mjs --date 2026-08-07 --commit
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eventWindowForBriefingDate } from "./lib/event-calendar-window.mjs";
import { fetchGovFixtures } from "./lib/event-calendar-fetch-gov.mjs";
import { fetchEarningsFixtures } from "./lib/event-calendar-fetch-earnings.mjs";
import { stripBannedUkEuData } from "./lib/event-calendar-merge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const calendarDir = path.join(root, "web/content/calendar");
const GOV_FILE = "gov-fixtures.json";
const EARNINGS_FILE = "earnings-fixtures.json";
const WATCHLIST_FILE = "earnings-watchlist.json";

function beijingTodayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function parseArgs(argv = process.argv.slice(2)) {
  let date = null;
  const dryRun = argv.includes("--dry-run");
  const commit = argv.includes("--commit");
  const idx = argv.indexOf("--date");
  if (idx >= 0 && argv[idx + 1]) {
    date = String(argv[idx + 1]).trim();
  }
  if (!date) date = beijingTodayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid --date (want YYYY-MM-DD): ${date}`);
  }
  return { date, dryRun, commit };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sampleIds(events, n = 5) {
  return (events || [])
    .slice(0, n)
    .map((e) => e.id || e.event || `${e.date}|${e.region}`)
    .filter(Boolean);
}

/**
 * Load written fixture files for generate tooling.
 * @param {string} [repoRoot]
 */
export function loadFixtureEvents(repoRoot = root) {
  const dir = path.join(repoRoot, "web/content/calendar");
  const gov = readJson(path.join(dir, GOV_FILE));
  const earnings = readJson(path.join(dir, EARNINGS_FILE));
  return {
    govEvents: Array.isArray(gov.events) ? gov.events : [],
    earningsEvents: Array.isArray(earnings.events) ? earnings.events : [],
    windowStart: gov.windowStart ?? earnings.windowStart ?? null,
    windowEnd: gov.windowEnd ?? earnings.windowEnd ?? null,
  };
}

function git(args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

function commitFixtures(briefingDate) {
  const name = git(["config", "user.name"]);
  const email = git(["config", "user.email"]);
  if (!name.stdout?.trim()) git(["config", "user.name", "syravocado-bot"]);
  if (!email.stdout?.trim()) {
    git(["config", "user.email", "syravocado-bot@users.noreply.github.com"]);
  }

  git([
    "add",
    path.join("web/content/calendar", GOV_FILE),
    path.join("web/content/calendar", EARNINGS_FILE),
  ]);
  const staged = git(["diff", "--cached", "--name-only"]);
  if (!staged.stdout?.trim()) {
    console.log("[event-calendar] no fixture changes to commit");
    return false;
  }
  const msg = `chore: refresh event calendar fixtures (${briefingDate})`;
  const commit = git(["commit", "-m", msg]);
  if (commit.status !== 0) {
    console.error(commit.stderr || commit.stdout);
    throw new Error("event calendar fixture commit failed");
  }
  console.log(`[event-calendar] committed fixtures: ${msg}`);
  return true;
}

function fixturePayload({ fetchedAt, windowStart, windowEnd, events, errors }) {
  const out = {
    fetchedAt,
    windowStart,
    windowEnd,
    events,
  };
  if (Array.isArray(errors) && errors.length) {
    out.errors = errors;
  }
  return out;
}

const FETCH_TIMEOUT_MS = 20_000;

/** Bound network waits so one hung IR/gov page cannot stall the CLI. */
function fetchWithTimeout(url, init = {}) {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal });
}

async function main() {
  const { date, dryRun, commit } = parseArgs();
  const { windowStart, windowEnd } = eventWindowForBriefingDate(date);
  const watchlistPath = path.join(calendarDir, WATCHLIST_FILE);
  const watchlist = readJson(watchlistPath);

  console.log(
    `[event-calendar] briefing=${date} window=${windowStart}..${windowEnd}`,
  );

  const govResult = await fetchGovFixtures({
    windowStart,
    windowEnd,
    fetchImpl: fetchWithTimeout,
  });
  const earningsResult = await fetchEarningsFixtures({
    watchlist,
    windowStart,
    windowEnd,
    fetchImpl: fetchWithTimeout,
  });

  const govEvents = stripBannedUkEuData(govResult.events || []);
  const earningsEvents = earningsResult.events || [];
  const fetchedAt = new Date().toISOString();

  const govPayload = fixturePayload({
    fetchedAt,
    windowStart,
    windowEnd,
    events: govEvents,
    errors: govResult.errors,
  });
  const earningsPayload = fixturePayload({
    fetchedAt,
    windowStart,
    windowEnd,
    events: earningsEvents,
    errors: earningsResult.errors,
  });

  console.log(
    `[event-calendar] gov events=${govEvents.length}` +
      (govResult.errors?.length ? ` errors=${govResult.errors.length}` : ""),
  );
  console.log(
    `[event-calendar] earnings events=${earningsEvents.length}` +
      (earningsResult.errors?.length
        ? ` errors=${earningsResult.errors.length}`
        : ""),
  );
  console.log(
    `[event-calendar] sample gov ids: ${sampleIds(govEvents).join(", ") || "(none)"}`,
  );
  console.log(
    `[event-calendar] sample earnings ids: ${sampleIds(earningsEvents).join(", ") || "(none)"}`,
  );

  if (dryRun) {
    console.log("[event-calendar] dry-run: not writing files");
    return;
  }

  writeJson(path.join(calendarDir, GOV_FILE), govPayload);
  writeJson(path.join(calendarDir, EARNINGS_FILE), earningsPayload);
  console.log(
    `[event-calendar] wrote ${GOV_FILE} and ${EARNINGS_FILE}`,
  );

  if (commit) {
    commitFixtures(date);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error("[event-calendar] failed:", err);
    process.exit(1);
  });
}
