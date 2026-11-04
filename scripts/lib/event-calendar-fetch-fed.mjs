// scripts/lib/event-calendar-fetch-fed.mjs
import { easternTimeToBeijing } from "./event-calendar-fetch-bls.mjs";

const FED_CALENDAR_JSON = "https://www.federalreserve.gov/json/calendar.json";
const FED_FOMC_HTML = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";

const SOURCE_JSON = {
  label: "Federal Reserve calendar",
  href: FED_CALENDAR_JSON,
};

const SOURCE_FOMC = {
  label: "Federal Reserve FOMC calendar",
  href: FED_FOMC_HTML,
};

/** Central-bank relevant Fed calendar types (skip Stat data releases). */
const CB_TYPES = new Set(["FOMC", "Speeches", "Testimony", "Beige"]);

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
};

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
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

function parseDayList(daysField) {
  const parts = String(daysField || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const part of parts) {
    const range = part.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\*?$/);
    if (range) {
      // Two-day FOMC meetings: use statement / decision day (last day).
      out.push(Number(range[2]));
      continue;
    }
    const single = part.match(/^(\d{1,2})\*?$/);
    if (single) out.push(Number(single[1]));
  }
  return out;
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parse Fed `calendar.json` text into windowed central-bank events.
 * @param {string} text
 * @param {{ windowStart: string, windowEnd: string }} opts
 */
export function parseFedCalendarJson(text, { windowStart, windowEnd }) {
  const cleaned = String(text || "").replace(/^\uFEFF/, "");
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Fed calendar JSON parse failed: ${err?.message || err}`);
  }
  const rows = Array.isArray(data?.events) ? data.events : [];
  const events = [];
  for (const row of rows) {
    const type = String(row?.type || "").trim();
    if (!CB_TYPES.has(type)) continue;
    const monthStr = String(row?.month || "");
    const ym = monthStr.match(/^(\d{4})-(\d{2})$/);
    if (!ym) continue;
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    const title = stripTags(row?.title || "").trim();
    if (!title) continue;
    for (const day of parseDayList(row?.days)) {
      const date = ymd(year, month, day);
      if (!inWindow(date, windowStart, windowEnd)) continue;
      const timeBeijing = easternTimeToBeijing(row?.time, date);
      const slug = slugify(title) || "fed-event";
      events.push({
        id: `fed-${slug}-${date}`,
        date,
        timeBeijing,
        region: "US",
        category: "central-bank",
        event: title,
        source: { ...SOURCE_JSON },
      });
    }
  }
  return events;
}

/**
 * Fallback: parse FOMC meeting calendars HTML for dated meetings in window.
 * @param {string} html
 * @param {{ windowStart: string, windowEnd: string }} opts
 */
export function parseFomcCalendarsHtml(html, { windowStart, windowEnd }) {
  const events = [];
  const panelRe =
    /<div class="panel panel-default">\s*<div class="panel-heading"><h4><a[^>]*>\s*(\d{4})\s+FOMC Meetings\s*<\/a><\/h4><\/div>([\s\S]*?)(?=<div class="panel panel-default">|$)/gi;
  let panelMatch;
  while ((panelMatch = panelRe.exec(html)) !== null) {
    const year = Number(panelMatch[1]);
    const body = panelMatch[2];
    const meetingRe =
      /fomc-meeting__month[^>]*>\s*<strong>\s*([A-Za-z]+)\s*<\/strong>[\s\S]*?fomc-meeting__date[^>]*>\s*([^<]+)</gi;
    let m;
    while ((m = meetingRe.exec(body)) !== null) {
      const month = MONTHS[m[1].toLowerCase()];
      if (!month) continue;
      const days = parseDayList(m[2].trim());
      if (!days.length) continue;
      const day = days[days.length - 1];
      const date = ymd(year, month, day);
      if (!inWindow(date, windowStart, windowEnd)) continue;
      const title = "FOMC Meeting";
      events.push({
        id: `fed-fomc-meeting-${date}`,
        date,
        timeBeijing: easternTimeToBeijing("2:00 p.m.", date),
        region: "US",
        category: "central-bank",
        event: title,
        source: { ...SOURCE_FOMC },
      });
    }
  }
  return events;
}

/**
 * Fetch Fed calendar JSON (preferred) or FOMC HTML fallback.
 * @param {string} windowStart
 * @param {string} windowEnd
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchFed(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const jsonRes = await fetchImpl(FED_CALENDAR_JSON);
  if (jsonRes.ok) {
    const text = await jsonRes.text();
    return parseFedCalendarJson(text, { windowStart, windowEnd });
  }

  const htmlRes = await fetchImpl(FED_FOMC_HTML);
  if (!htmlRes.ok) {
    throw new Error(
      `Fed calendar fetch failed: json=${jsonRes.status} html=${htmlRes.status}`,
    );
  }
  const html = await htmlRes.text();
  return parseFomcCalendarsHtml(html, { windowStart, windowEnd });
}
