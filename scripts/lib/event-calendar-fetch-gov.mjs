// scripts/lib/event-calendar-fetch-gov.mjs

import { fetchBls, easternTimeToBeijing } from "./event-calendar-fetch-bls.mjs";
import { fetchFed } from "./event-calendar-fetch-fed.mjs";

const BEA_SCHEDULE_URL = "https://www.bea.gov/news/schedule";
const NBS_PRESS_URL = "https://www.stats.gov.cn/english/PressRelease/";
const BOJ_MPM_URL = "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm";
const BOE_MPC_URL = "https://www.bankofengland.co.uk/monetary-policy";
const ECB_GC_URL =
  "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html";

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function inWindow(date, windowStart, windowEnd) {
  return date >= windowStart && date <= windowEnd;
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function yearsForWindow(windowStart, windowEnd) {
  const ys = new Set([
    Number(String(windowStart).slice(0, 4)),
    Number(String(windowEnd).slice(0, 4)),
  ]);
  return [...ys].filter((y) => Number.isFinite(y));
}

function notice(name, message) {
  console.warn(`[event-calendar] ${name}: ${message}`);
}

/**
 * Parse BEA release schedule HTML (month+day rows; year inferred from window).
 */
export function parseBeaScheduleHtml(html, { windowStart, windowEnd }) {
  const events = [];
  const years = yearsForWindow(windowStart, windowEnd);
  const rowRe =
    /class="release-date">\s*([A-Za-z]+)\s+(\d{1,2})\s*<\/div>\s*<small[^>]*>\s*([^<]*)<\/small>[\s\S]*?class="release-title[^"]*"[^>]*>\s*([^<]+)/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) continue;
    const day = Number(m[2]);
    const timeEt = m[3].trim();
    const title = stripTags(m[4]).trim();
    if (!title) continue;
    for (const year of years) {
      const date = ymd(year, month, day);
      if (!inWindow(date, windowStart, windowEnd)) continue;
      const slug = slugify(title) || "bea-release";
      events.push({
        id: `bea-${slug}-${date}`,
        date,
        timeBeijing: easternTimeToBeijing(timeEt),
        region: "US",
        category: "data",
        event: title,
        source: {
          label: "BEA release schedule",
          href: BEA_SCHEDULE_URL,
        },
      });
    }
  }
  return events;
}

export async function fetchBea(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(BEA_SCHEDULE_URL);
  if (!res.ok) {
    throw new Error(`BEA schedule fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseBeaScheduleHtml(html, { windowStart, windowEnd });
}

/**
 * NBS English press list — only emit rows with an explicit YYYY-MM-DD in the link/text.
 * Never invent dates.
 */
export function parseNbsPressHtml(html, { windowStart, windowEnd }) {
  const events = [];
  const linkRe =
    /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const title = stripTags(m[2]).trim();
    if (!title || title.length < 8) continue;
    const dateMatch =
      href.match(/(20\d{2})(\d{2})(\d{2})/) ||
      title.match(/(20\d{2})-(\d{2})-(\d{2})/) ||
      href.match(/(20\d{2})\/(\d{2})\/(\d{2})/);
    if (!dateMatch) continue;
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    if (!inWindow(date, windowStart, windowEnd)) continue;
    const abs = href.startsWith("http")
      ? href
      : new URL(href, NBS_PRESS_URL).href;
    const slug = slugify(title) || "nbs-release";
    events.push({
      id: `nbs-${slug}-${date}`,
      date,
      region: "China",
      category: "data",
      event: title,
      source: {
        label: "NBS English press release",
        href: abs,
      },
    });
  }
  return events;
}

export async function fetchNbs(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(NBS_PRESS_URL);
  if (!res.ok) {
    notice("nbs", `fetch ${res.status}, returning []`);
    return [];
  }
  const html = await res.text();
  const events = parseNbsPressHtml(html, { windowStart, windowEnd });
  if (!events.length) {
    notice("nbs", "no dated release rows in window");
  }
  return events;
}

/**
 * Parse BoJ monetary policy meeting schedule tables (Date of MPM column).
 * Emits one event on the final meeting day.
 */
export function parseBojMpmHtml(html, { windowStart, windowEnd }) {
  const events = [];
  const sectionRe =
    /<h2[^>]*id="p(\d{4})"[^>]*>\s*\d{4}\s*<\/h2>([\s\S]*?)(?=<h2\b|$)/gi;
  let section;
  while ((section = sectionRe.exec(html)) !== null) {
    const year = Number(section[1]);
    const body = section[2];
    const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(body)) !== null) {
      const inner = tr[1];
      if (/<th\b/i.test(inner)) continue;
      const firstTd = inner.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
      if (!firstTd) continue;
      const text = stripTags(firstTd[1]);
      // e.g. "July 30 (Thurs.), 31 (Fri.)" or "Jan. 22 (Thurs.), 23 (Fri.)"
      const dayMatches = [...text.matchAll(/([A-Za-z]+)\.?\s+(\d{1,2})\s*\(/g)];
      if (!dayMatches.length) continue;
      const last = dayMatches[dayMatches.length - 1];
      const monthToken = last[1].toLowerCase();
      const month = MONTHS[monthToken];
      if (!month) continue;
      const day = Number(last[2]);
      const date = ymd(year, month, day);
      if (!inWindow(date, windowStart, windowEnd)) continue;
      events.push({
        id: `boj-mpm-${date}`,
        date,
        region: "Japan",
        category: "central-bank",
        event: "BoJ Monetary Policy Meeting",
        source: {
          label: "Bank of Japan MPM schedule",
          href: BOJ_MPM_URL,
        },
      });
    }
  }
  return events;
}

export async function fetchBoj(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(BOJ_MPM_URL);
  if (!res.ok) {
    throw new Error(`BoJ MPM schedule fetch failed: ${res.status}`);
  }
  const html = await res.text();
  return parseBojMpmHtml(html, { windowStart, windowEnd });
}

/**
 * UK: central-bank only. Soft stub — return [] when page has no parseable MPC dates.
 */
export async function fetchBoeCbOnly(
  windowStart,
  windowEnd,
  fetchImpl = globalThis.fetch,
) {
  void windowStart;
  void windowEnd;
  const res = await fetchImpl(BOE_MPC_URL);
  if (!res.ok) {
    notice("boe", `fetch ${res.status}, returning []`);
    return [];
  }
  // v1: no stable dated table on landing page — do not invent.
  notice("boe", "no dated MPC rows parsed (v1 soft stub)");
  return [];
}

/**
 * EU: central-bank only. Soft stub — return [] when GC calendar is not parseable.
 */
export async function fetchEcbCbOnly(
  windowStart,
  windowEnd,
  fetchImpl = globalThis.fetch,
) {
  void windowStart;
  void windowEnd;
  const res = await fetchImpl(ECB_GC_URL);
  if (!res.ok) {
    notice("ecb", `fetch ${res.status}, returning []`);
    return [];
  }
  notice("ecb", "no dated Governing Council rows parsed (v1 soft stub)");
  return [];
}

/**
 * Soft-fail orchestrator for official gov calendars.
 * @param {{ windowStart: string, windowEnd: string, fetchImpl?: typeof fetch }} opts
 */
export async function fetchGovFixtures({
  windowStart,
  windowEnd,
  fetchImpl = globalThis.fetch,
}) {
  const errors = [];
  const events = [];
  async function run(name, fn) {
    try {
      events.push(...(await fn()));
    } catch (err) {
      errors.push({ name, message: String(err?.message || err) });
    }
  }
  await run("bls", () => fetchBls(windowStart, windowEnd, fetchImpl));
  await run("fed", () => fetchFed(windowStart, windowEnd, fetchImpl));
  await run("bea", () => fetchBea(windowStart, windowEnd, fetchImpl));
  await run("nbs", () => fetchNbs(windowStart, windowEnd, fetchImpl));
  await run("boj", () => fetchBoj(windowStart, windowEnd, fetchImpl));
  await run("boe", () => fetchBoeCbOnly(windowStart, windowEnd, fetchImpl));
  await run("ecb", () => fetchEcbCbOnly(windowStart, windowEnd, fetchImpl));
  return { events, errors };
}
