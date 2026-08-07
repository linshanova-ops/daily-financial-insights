// scripts/lib/event-calendar-fetch-bls.mjs

const BLS_SCHEDULE_BASE = "https://www.bls.gov/schedule";
const SOURCE = {
  label: "BLS release calendar",
  href: "https://www.bls.gov/schedule/2026/",
};

/** Keep market-vital BLS releases; drop holidays and obscure series. */
const VITAL_PATTERNS = [
  /\bconsumer price index\b/i,
  /\bcpi\b/i,
  /\bproducer price index\b/i,
  /\bppi\b/i,
  /\bemployment situation\b/i,
  /\bjobless claims\b/i,
  /\bunemployment insurance\b/i,
  /\bjob openings and labor turnover\b/i,
  /\bjolts\b/i,
  /\bimport and export price indexes\b/i,
  /\bimport\/export price indexes\b/i,
];

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

/**
 * US Eastern clock time → Beijing `HH:mm`.
 * Project mapping: EDT offset used as +12h same calendar day
 * (e.g. 08:30 ET → 20:30 Beijing). Not DST-aware.
 */
export function easternTimeToBeijing(timeEt) {
  const m = String(timeEt || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return undefined;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const beijingHour = (hour + 12) % 24;
  return `${String(beijingHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBlDate(text) {
  const m = String(text || "").match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function slugify(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isVitalRelease(title) {
  const t = String(title || "").trim();
  if (!t) return false;
  if (/^labor day$/i.test(t) || /\bholiday\b/i.test(t)) return false;
  return VITAL_PATTERNS.some((re) => re.test(t));
}

function inWindow(date, windowStart, windowEnd) {
  return date >= windowStart && date <= windowEnd;
}

function extractRows(html) {
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(html)) !== null) {
    const inner = trMatch[1];
    if (/<th\b/i.test(inner)) continue;
    const cells = [];
    const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRe.exec(inner)) !== null) {
      cells.push(stripTags(tdMatch[1]));
    }
    if (cells.length >= 3) rows.push(cells);
  }
  return rows;
}

/**
 * @param {string} html
 * @param {{ windowStart: string, windowEnd: string }} opts
 * @returns {Array<object>}
 */
export function parseBlsScheduleHtml(html, { windowStart, windowEnd }) {
  const year = String(windowStart || "").slice(0, 4) || "2026";
  const source = {
    ...SOURCE,
    href: `${BLS_SCHEDULE_BASE}/${year}/`,
  };

  const events = [];
  for (const [dateText, timeText, title] of extractRows(html)) {
    if (!isVitalRelease(title)) continue;
    const date = parseBlDate(dateText);
    if (!date || !inWindow(date, windowStart, windowEnd)) continue;
    const slug = slugify(title) || "release";
    events.push({
      id: `bls-${slug}-${date}`,
      date,
      timeBeijing: easternTimeToBeijing(timeText),
      region: "US",
      category: "data",
      event: title,
      source: { ...source },
    });
  }
  return events;
}

/**
 * Fetch BLS schedule HTML and parse into calendar events.
 * @param {string} windowStart
 * @param {string} windowEnd
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchBls(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const year = String(windowStart || "").slice(0, 4) || "2026";
  const url = `${BLS_SCHEDULE_BASE}/${year}/`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`BLS schedule fetch failed: ${res.status} ${url}`);
  }
  const html = await res.text();
  return parseBlsScheduleHtml(html, { windowStart, windowEnd });
}
