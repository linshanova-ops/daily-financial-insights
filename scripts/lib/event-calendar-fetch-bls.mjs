// scripts/lib/event-calendar-fetch-bls.mjs

const BLS_SCHEDULE_BASE = "https://www.bls.gov/schedule";
/** CI/cloud often get 403 from www.bls.gov; blsmon1 mirror serves the same schedule. */
const BLS_MIRROR_BASE = "https://blsmon1.bls.gov/schedule";
const SOURCE = {
  label: "BLS release calendar",
  // Prefer mirror host — www.bls.gov schedule pages are often 403 from CI.
  href: "https://blsmon1.bls.gov/schedule/2026/home.htm",
}

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
 * US Eastern clock on `date` → Beijing `HH:mm`.
 * Uses America/New_York on that date, so the hour follows the event's own offset.
 */
export function easternTimeToBeijing(timeEt, date) {
  const raw = String(timeEt || "")
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return undefined;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ampm = (m[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  const [y, mo, d] = date.split("-").map(Number);
  const want = Date.UTC(y, mo - 1, d, hour, minute);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  let ms = want;
  for (let i = 0; i < 3; i++) {
    const map = {};
    for (const p of fmt.formatToParts(new Date(ms))) map[p.type] = p.value;
    const got = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute);
    ms += want - got;
  }
  const bj = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type) => bj.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour").padStart(2, "0")}:${get("minute").padStart(2, "0")}`;
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
      timeBeijing: easternTimeToBeijing(timeText, date),
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
 * Tries www.bls.gov first, then blsmon1 mirror (same list markup).
 * @param {string} windowStart
 * @param {string} windowEnd
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchBls(windowStart, windowEnd, fetchImpl = globalThis.fetch) {
  const year = String(windowStart || "").slice(0, 4) || "2026";
  const urls = [
    `${BLS_SCHEDULE_BASE}/${year}/`,
    `${BLS_SCHEDULE_BASE}/${year}/home.htm`,
    `${BLS_MIRROR_BASE}/${year}/home.htm`,
    `${BLS_MIRROR_BASE}/${year}/`,
  ];
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) {
        errors.push(`${res.status} ${url}`);
        continue;
      }
      const html = await res.text();
      if (/access denied/i.test(html) && html.length < 5000) {
        errors.push(`access-denied ${url}`);
        continue;
      }
      return parseBlsScheduleHtml(html, { windowStart, windowEnd });
    } catch (err) {
      errors.push(`${url}: ${err?.message || err}`);
    }
  }
  throw new Error(`BLS schedule fetch failed: ${errors.join("; ")}`);
}
