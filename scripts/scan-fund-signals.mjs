#!/usr/bin/env node
/**
 * Phase 2 Fund scanner — fetch public RSS, match monitored funds, update
 * web/content/fund/{signals,review,meta}.json
 *
 * Confirmed hits are permanent (merge, never delete).
 * Review queue is rebuilt from the current scan window.
 *
 * Usage:
 *   node scripts/scan-fund-signals.mjs
 *   node scripts/scan-fund-signals.mjs --commit
 *   node scripts/scan-fund-signals.mjs --window-hours 720
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bilingualSummary,
  cleanHeadline,
  confidenceTier,
  formatShanghaiLabel,
  fundAliases,
  googleNewsSearchAliases,
  parseRssItems,
  resolvePublisherUrl,
  scoreFundMention,
  signalDedupKey,
  withinHours,
} from "./lib/fund-signal-match.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const fundDir = path.join(root, "web/content/fund");
const WINDOW_HOURS = (() => {
  const idx = process.argv.indexOf("--window-hours");
  if (idx >= 0 && process.argv[idx + 1]) {
    const n = Number(process.argv[idx + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 72;
})();
const UA = "syravocado-fund-scan/1.0 (+https://github.com/linshanova-ops/daily-financial-insights)";

const commitFlag = process.argv.includes("--commit");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fundDir, name), "utf8"));
}

function writeJson(name, data) {
  fs.writeFileSync(
    path.join(fundDir, name),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function googleNewsUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function guessTag(title) {
  const t = title.toLowerCase();
  if (/hire|hiring|appoint|joins|names/.test(t)) return "人员 / 招聘";
  if (/raise|fundraising|capital|closes .+fund/.test(t)) return "募资";
  if (/return|performance|outperform|gains|profit/.test(t)) return "业绩";
  if (/launch|opens|expands|team|strategy|product/.test(t)) return "组织 / 产品";
  if (/lawsuit|probe|fine|sec |regulator/.test(t)) return "风险 / 监管";
  return "动态";
}

function toSignalDate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return formatShanghaiLabel().slice(0, 10).replace(/-/g, ".");
  const label = formatShanghaiLabel(d);
  return label.slice(0, 10);
}

async function collectItems(monitored) {
  const sources = [];
  const items = [];

  // 1) Hedgeweek RSS
  try {
    const xml = await fetchText("https://www.hedgeweek.com/feed/");
    const parsed = parseRssItems(xml, "Hedgeweek");
    items.push(...parsed);
    sources.push({ id: "hedgeweek", ok: true, count: parsed.length });
  } catch (err) {
    sources.push({ id: "hedgeweek", ok: false, error: String(err.message || err) });
  }

  // 2) Google News — one primary alias per monitored fund (full coverage).
  // Previously capped at 40 aliases / 6 batches, so late-ranked admin-added
  // names (e.g. ranks 101+) never entered the GN query pool.
  const { aliases, uncovered, monitoredCount } = googleNewsSearchAliases(monitored);
  if (uncovered.length) {
    console.warn(
      `[fund-scan] WARN ${uncovered.length}/${monitoredCount} funds lack a search alias:`,
      uncovered.slice(0, 8).join(", "),
    );
  }
  const batches = chunk(aliases, 6);
  let gCount = 0;
  let gOk = 0;
  for (const batch of batches) {
    const query =
      batch.map((a) => `"${a}"`).join(" OR ") +
      " (hedge fund OR asset management OR capital)";
    try {
      const xml = await fetchText(googleNewsUrl(query));
      const parsed = parseRssItems(xml, "Google News");
      items.push(...parsed);
      gCount += parsed.length;
      gOk += 1;
    } catch {
      // continue other batches
    }
  }
  sources.push({
    id: "google-news",
    ok: gOk > 0,
    count: gCount,
    note: gOk
      ? `${gOk}/${batches.length} batches ok · ${aliases.length} aliases · ${monitoredCount} monitored`
      : "all batches failed",
    coverage: {
      monitored: monitoredCount,
      searchAliases: aliases.length,
      uncovered: uncovered.length,
    },
  });

  // 3) HedgeCo Insights — public hedge-fund trade RSS (third live source)
  try {
    const xml = await fetchText("https://www.hedgeco.net/news/feed/");
    const parsed = parseRssItems(xml, "HedgeCo");
    items.push(...parsed);
    sources.push({ id: "hedgeco", ok: true, count: parsed.length });
  } catch (err) {
    sources.push({
      id: "hedgeco",
      ok: false,
      count: 0,
      error: String(err.message || err),
    });
  }

  return { items, sources };
}

function matchItems(items, monitored) {
  const confirmed = [];
  const review = [];
  const now = Date.now();

  for (const item of items) {
    if (item.pubDate && !withinHours(item.pubDate, WINDOW_HOURS, now)) continue;
    const blob = `${item.title}\n${item.summary}`;

    let best = null;
    for (const fund of monitored) {
      const { score, matchedAs } = scoreFundMention(blob, {
        name: fund.name,
        aliases: fundAliases(fund.name),
      });
      if (!best || score > best.score) {
        best = { fund, score, matchedAs };
      }
    }
    if (!best || best.score <= 0) continue;

    const tier = confidenceTier(best.score);
    if (tier === "exclude") {
      // Skip industry-only / no-name noise from the review queue
      continue;
    }

    const title = cleanHeadline(item.title);
    const tag = guessTag(title);
    const { summaryEn, summary } = bilingualSummary(title, best.fund.name, tag);
    const row = {
      id: `sig-${toSignalDate(item.pubDate).replaceAll(".", "")}-${Math.abs(
        hash(title + best.fund.name),
      )
        .toString(36)
        .slice(0, 6)}`,
      date: toSignalDate(item.pubDate),
      title,
      summary,
      summaryEn,
      fund: best.fund.name,
      source: item.source,
      tag,
      status: tier === "confirmed" ? "confirmed" : "review",
      href: item.link || null,
      confidence: best.score,
    };

    if (tier === "confirmed") confirmed.push(row);
    else {
      review.push({
        id: `rev-${row.id}`,
        title: row.title,
        reason: `中等置信度命中「${best.matchedAs || best.fund.name}」，待人工复核。`,
        confidence: `${best.score}%`,
        status: "review",
        href: row.href,
      });
    }
  }

  return { confirmed, review };
}

/** Resolve Google News links to publisher URLs (bounded concurrency). */
async function resolveSignalHrefs(rows, concurrency = 3) {
  const need = rows.filter(
    (r) => r.href && /news\.google\.com/i.test(String(r.href)),
  );
  let i = 0;
  async function worker() {
    while (i < need.length) {
      const idx = i++;
      const row = need[idx];
      const resolved = await resolvePublisherUrl(row.href, { timeoutMs: 10000 });
      if (resolved) row.href = resolved;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(need.length, 1)) }, () =>
      worker(),
    ),
  );
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function mergeConfirmed(existing, incoming) {
  const map = new Map();
  for (const row of existing) {
    map.set(signalDedupKey(row.title, row.fund), row);
  }
  let added = 0;
  for (const row of incoming) {
    const key = signalDedupKey(row.title, row.fund);
    if (map.has(key)) continue;
    map.set(key, row);
    added += 1;
  }
  const merged = [...map.values()].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)),
  );
  return { merged, added };
}

function git(args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

function commitFundFiles() {
  const name = git(["config", "user.name"]);
  const email = git(["config", "user.email"]);
  if (!name.stdout?.trim()) git(["config", "user.name", "syravocado-bot"]);
  if (!email.stdout?.trim()) {
    git(["config", "user.email", "syravocado-bot@users.noreply.github.com"]);
  }

  git([
    "add",
    "web/content/fund/signals.json",
    "web/content/fund/review.json",
    "web/content/fund/meta.json",
  ]);
  const staged = git(["diff", "--cached", "--name-only"]);
  if (!staged.stdout?.trim()) {
    console.log("[fund-scan] no content changes to commit");
    return false;
  }
  const msg = `chore: refresh Fund signals (${formatShanghaiLabel()})`;
  const commit = git(["commit", "-m", msg]);
  if (commit.status !== 0) {
    console.error(commit.stderr || commit.stdout);
    throw new Error("fund scan commit failed");
  }
  const push = git(["push", "origin", "HEAD"]);
  if (push.status !== 0) {
    console.error(push.stderr || push.stdout);
    throw new Error("fund scan push failed");
  }
  console.log("[fund-scan] committed and pushed Fund content");
  return true;
}

async function main() {
  const universe = readJson("universe.json");
  const monitoredFile = readJson("monitored.json");
  const existingSignals = readJson("signals.json");
  const meta = readJson("meta.json");

  const byRank = new Map(universe.map((f) => [f.rank, f]));
  const monitored = monitoredFile.funds
    .map((ref) => byRank.get(ref.rank) || { rank: ref.rank, name: ref.name })
    .filter((f) => f?.name);

  console.log(`[fund-scan] monitored=${monitored.length} windowHours=${WINDOW_HOURS}`);
  const { items, sources } = await collectItems(monitored);
  console.log(`[fund-scan] fetched items=${items.length}`);

  const { confirmed, review } = matchItems(items, monitored);
  await resolveSignalHrefs(confirmed);
  await resolveSignalHrefs(review);
  const { merged, added } = mergeConfirmed(existingSignals, confirmed);

  // Drop ephemeral confidence field from persisted confirmed rows
  const signalsOut = merged.map(({ confidence, ...rest }) => rest);

  // Dedupe review by title
  const reviewMap = new Map();
  for (const r of review) {
    const key = r.title.toLowerCase();
    if (!reviewMap.has(key)) reviewMap.set(key, r);
  }
  const reviewOut = [...reviewMap.values()].slice(0, 30);

  const okSources = sources.filter((s) => s.ok).length;
  const now = new Date();
  const nextMeta = {
    ...meta,
    updatedAt: now.toISOString(),
    updatedAtLabel: formatShanghaiLabel(now),
    timezone: "Asia / Shanghai",
    sourcesChecked: `${okSources}/${sources.length}`,
    sourcesNote: sources
      .map((s) =>
        s.ok
          ? `${s.id}:${s.count}`
          : `${s.id}:down${s.note ? `(${s.note})` : ""}`,
      )
      .join(" · "),
    scanWindow:
      WINDOW_HOURS % 24 === 0 && WINDOW_HOURS >= 24
        ? `每日扫描过去 ${WINDOW_HOURS / 24} 天 · 命中永久归档`
        : `每日扫描过去 ${WINDOW_HOURS} 小时 · 命中永久归档`,
    phase: 2,
    phaseNote:
      "Live RSS scan on briefing windows (Hedgeweek + Google News + HedgeCo). Confirmed hits are permanent. Google News queries one alias per monitored fund.",
    lastScan: {
      at: now.toISOString(),
      fetched: items.length,
      newConfirmed: added,
      review: reviewOut.length,
      windowHours: WINDOW_HOURS,
      sources,
    },
  };

  writeJson("signals.json", signalsOut);
  writeJson("review.json", reviewOut);
  writeJson("meta.json", nextMeta);

  console.log(
    `[fund-scan] confirmed=${signalsOut.length} (+${added}) review=${reviewOut.length} sources=${nextMeta.sourcesChecked}`,
  );

  if (commitFlag) commitFundFiles();
}

main().catch((err) => {
  console.error("[fund-scan] failed:", err);
  process.exit(1);
});
