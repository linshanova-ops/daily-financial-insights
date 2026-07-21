/**
 * Pure helpers for Fund signal matching / confidence.
 * Used by scan-fund-signals.mjs and unit tests.
 */

/** @param {string} name */
function buildAliasSet(name) {
  const base = String(name || "").trim();
  if (!base) return { aliases: [], knownShort: new Set() };
  const aliases = new Set([base]);

  // Drop common legal / corporate suffixes
  const short = base
    .replace(
      /\b(Investment Group|Asset Management|Capital Partners|Capital Management|Capital|Management|Partners|Associates|Corporation|International|Group)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (short.length >= 3) aliases.add(short);

  // Known short brands
  const map = {
    "Citadel Investment Group": ["Citadel"],
    "Millennium Capital Partners": ["Millennium"],
    "Point72 Asset Management": ["Point72", "Point 72"],
    "Balyasny Asset Management": ["Balyasny", "BAM"],
    "D. E. Shaw": ["DE Shaw", "D.E. Shaw", "DESCO"],
    "Two Sigma Investments": ["Two Sigma"],
    "Two Sigma International": ["Two Sigma"],
    "Bridgewater Associates": ["Bridgewater"],
    "Renaissance Technologies": ["Renaissance", "Medallion"],
    "Elliott Investment Management": ["Elliott"],
    "Qube Research & Technologies": ["Qube", "QRT"],
    "Verition Fund Management": ["Verition"],
    "Jain Global": ["Jain Global"],
  };
  const knownShort = new Set(
    Object.values(map)
      .flat()
      .map((s) => s.toLowerCase()),
  );
  for (const a of map[base] || []) aliases.add(a);

  return { aliases: [...aliases], knownShort };
}

/** @param {string} name */
export function fundAliases(name) {
  return buildAliasSet(name).aliases;
}

/**
 * @param {string} text
 * @param {{ name: string, aliases?: string[] }} fund
 * @returns {{ score: number, matchedAs: string | null }}
 */
export function scoreFundMention(text, fund) {
  const hay = String(text || "");
  const built = buildAliasSet(fund.name);
  const aliases = fund.aliases?.length ? fund.aliases : built.aliases;
  let best = 0;
  let matchedAs = null;

  for (const alias of aliases) {
    if (!alias) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (!re.test(hay)) continue;
    let score;
    if (alias.toLowerCase() === fund.name.toLowerCase()) score = 92;
    else if (built.knownShort.has(alias.toLowerCase())) score = 82;
    else score = Math.min(88, 55 + alias.length);
    if (score > best) {
      best = score;
      matchedAs = alias;
    }
  }

  // Industry-only articles without a firm name stay weak
  if (best === 0 && /\bhedge funds?\b/i.test(hay)) {
    return { score: 36, matchedAs: null };
  }

  return { score: best, matchedAs };
}

/** @param {number} score */
export function confidenceTier(score) {
  if (score >= 75) return "confirmed";
  if (score >= 45) return "review";
  return "exclude";
}

/**
 * @param {string} isoOrRssDate
 * @param {number} windowHours
 */
export function withinHours(isoOrRssDate, windowHours, now = Date.now()) {
  const t = Date.parse(isoOrRssDate);
  if (Number.isNaN(t)) return false;
  return now - t <= windowHours * 3600 * 1000;
}

/**
 * @param {string} xml
 * @returns {{ title: string, link: string, pubDate: string, summary: string, source: string }[]}
 */
export function parseRssItems(xml, sourceLabel = "RSS") {
  const items = [];
  const blocks = String(xml || "").match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = textBetween(block, "title");
    const link = textBetween(block, "link") || attrBetween(block, "link", "href");
    const pubDate = textBetween(block, "pubDate") || textBetween(block, "published");
    const summary =
      textBetween(block, "description") ||
      textBetween(block, "content:encoded") ||
      "";
    if (!title) continue;
    items.push({
      title: decodeXml(stripTags(title)),
      link: decodeXml(stripTags(link)),
      pubDate,
      summary: decodeXml(stripTags(summary)).slice(0, 400),
      source: sourceLabel,
    });
  }
  return items;
}

function textBetween(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return (m && (m[1] || m[2]) || "").trim();
}

function attrBetween(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*/?>`, "i");
  const m = xml.match(re);
  return (m && m[1] || "").trim();
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function signalDedupKey(title, fund) {
  return `${String(title || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()}::${String(fund || "")
    .toLowerCase()
    .trim()}`;
}

export function formatShanghaiLabel(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // en-CA → YYYY-MM-DD, HH:MM
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
