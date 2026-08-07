// scripts/lib/event-calendar-fetch-earnings.mjs

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

const CONCURRENCY = 4;

function stripTags(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inWindow(date, windowStart, windowEnd) {
  return date >= windowStart && date <= windowEnd;
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function notice(name, message) {
  console.warn(`[event-calendar] earnings/${name}: ${message}`);
}

/**
 * Collect ISO dates from IR page text using common patterns.
 * Never invents dates outside the HTML.
 */
function extractDatesFromText(text) {
  const found = new Set();

  const isoRe = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  let m;
  while ((m = isoRe.exec(text)) !== null) {
    found.add(`${m[1]}-${m[2]}-${m[3]}`);
  }

  const longRe =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
  while ((m = longRe.exec(text)) !== null) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) continue;
    found.add(ymd(Number(m[3]), month, Number(m[2])));
  }

  return [...found].sort();
}

/**
 * Prefer dates near "earnings on" / "announce earnings" / "next earnings" phrasing.
 */
function preferEarningsLabeledDates(text, candidates) {
  const labeled = new Set();
  const contextRe =
    /(?:next\s+earnings|announce(?:s|d)?\s+earnings|earnings\s+(?:call\s+)?(?:on|for|date)|will\s+announce\s+earnings)[\s\S]{0,80}?(?:(20\d{2})-(\d{2})-(\d{2})|(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d{2}))/gi;
  let m;
  while ((m = contextRe.exec(text)) !== null) {
    if (m[1]) {
      labeled.add(`${m[1]}-${m[2]}-${m[3]}`);
    } else {
      const month = MONTHS[m[4].toLowerCase()];
      if (month) labeled.add(ymd(Number(m[6]), month, Number(m[5])));
    }
  }
  // Never fall back to unlabeled page dates (e.g. "Updated August 11") —
  // that invents fake earnings days.
  return candidates.filter((d) => labeled.has(d));
}

function buildEarningsEvent(company, date) {
  const name = company.name || company.id || "Company";
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id: `earnings-${company.id || slug}-${date}`,
    date,
    region: company.region,
    category: "earnings",
    event: `${name} earnings`,
    source: {
      label: `${name} IR`,
      href: company.irUrl,
    },
  };
}

/**
 * Parse earnings announcement date from IR HTML for one company.
 * @returns {Array<object>} zero or one event in the window
 */
export function parseEarningsFromIrHtml(html, company, { windowStart, windowEnd }) {
  if (!company || company.status === "pre-ipo") return [];
  if (!company.irUrl) return [];

  const text = stripTags(html);
  const all = extractDatesFromText(text);
  const inWin = all.filter((d) => inWindow(d, windowStart, windowEnd));
  if (!inWin.length) return [];

  const ranked = preferEarningsLabeledDates(text, inWin);
  if (!ranked.length) return [];
  const date = ranked[0]; // earliest among labeled
  return [buildEarningsEvent(company, date)];
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/**
 * Soft-fail orchestrator: fetch IR pages for public watchlist companies.
 * @param {{ watchlist: { companies?: Array<object> }, windowStart: string, windowEnd: string, fetchImpl?: typeof fetch }} opts
 */
export async function fetchEarningsFixtures({
  watchlist,
  windowStart,
  windowEnd,
  fetchImpl = globalThis.fetch,
}) {
  const companies = (watchlist?.companies || []).filter(
    (c) => c && c.status !== "pre-ipo" && c.irUrl,
  );
  const events = [];
  const errors = [];

  await mapPool(companies, CONCURRENCY, async (company) => {
    const name = company.id || company.name || "company";
    try {
      const res = await fetchImpl(company.irUrl);
      if (!res.ok) {
        errors.push({ name, message: `fetch ${res.status}` });
        notice(name, `fetch ${res.status}, skipping`);
        return;
      }
      const html = await res.text();
      const parsed = parseEarningsFromIrHtml(html, company, {
        windowStart,
        windowEnd,
      });
      events.push(...parsed);
    } catch (err) {
      errors.push({ name, message: String(err?.message || err) });
      notice(name, String(err?.message || err));
    }
  });

  return { events, errors };
}
