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
    "Oaktree Capital Management": ["Oaktree"],
    "HAO Capital": ["HAO Capital", "Hao Capital"],
    "Sona Asset Management": ["Sona"],
    "LMR Partners": ["LMR"],
    "Caxton Associates": ["Caxton"],
    "Linden Advisors": ["Linden"],
    "Waha Investments": ["Waha"],
    PIMCO: ["PIMCO"],
    Barings: ["Barings"],
    "Neuberger Berman": ["Neuberger", "Neuberger Berman"],
    Brookfield: ["Brookfield"],
    Schroders: ["Schroders", "Schroder"],
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
 * @returns {{ title: string, link: string, pubDate: string, summary: string, source: string, publisherUrl?: string | null }[]}
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
    const publisherUrl = attrBetween(block, "source", "url") || null;
    const publisherName = textBetween(block, "source");
    if (!title) continue;
    items.push({
      title: decodeXml(stripTags(title)),
      link: decodeXml(stripTags(link)),
      pubDate,
      summary: decodeXml(stripTags(summary)).slice(0, 400),
      source: publisherName ? decodeXml(stripTags(publisherName)) : sourceLabel,
      publisherUrl,
    });
  }
  return items;
}

/** Strip trailing " - Publisher" from Google News titles. */
export function cleanHeadline(title) {
  return String(title || "")
    .replace(/\s+[-–|]\s+[^-–|]{2,40}$/u, "")
    .trim();
}

/**
 * Bilingual seed: English one-liner + Chinese one-liner.
 * @returns {{ summaryEn: string, summary: string }}
 */
export function bilingualSummary(title, fundName, tag) {
  const headline = cleanHeadline(title);
  const t = headline.toLowerCase();
  let summaryEn;
  let summary;

  if (/hire|hiring|appoint|joins|names/.test(t)) {
    summaryEn = `${fundName}: hiring / personnel move — ${headline}.`;
    summary = `${fundName} 人事/招聘动向：${headline}。`;
  } else if (/raise|fundraising|capital|closes .+fund|raises/.test(t)) {
    summaryEn = `${fundName}: capital / fundraising signal — ${headline}.`;
    summary = `${fundName} 募资/扩容信号：${headline}。`;
  } else if (/return|performance|outperform|gains|profit|posts/.test(t)) {
    summaryEn = `${fundName}: performance update — ${headline}.`;
    summary = `${fundName} 业绩相关：${headline}。`;
  } else if (/launch|opens|expands|team|strategy|product/.test(t)) {
    summaryEn = `${fundName}: product / organization update — ${headline}.`;
    summary = `${fundName} 组织/产品动向：${headline}。`;
  } else if (/lawsuit|probe|fine|sec |regulator|sues/.test(t)) {
    summaryEn = `${fundName}: risk / regulatory note — ${headline}.`;
    summary = `${fundName} 风险/监管相关：${headline}。`;
  } else {
    summaryEn = `${fundName}: ${headline}.`;
    summary = `${fundName}：${headline}（${tag}）。`;
  }

  return { summaryEn, summary };
}

/**
 * Resolve Google News article URLs to publisher links when possible.
 * Falls back to the input URL.
 * @param {string} url
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function resolvePublisherUrl(url, opts = {}) {
  const input = String(url || "").trim();
  if (!input) return null;

  try {
    const parsed = new URL(input);
    const direct = parsed.searchParams.get("url");
    if (direct && /^https?:\/\//i.test(direct) && !/news\.google\.com/i.test(direct)) {
      return direct;
    }

    if (!/news\.google\.com/i.test(parsed.hostname)) {
      return input;
    }

    // Follow a few redirects in case Location already leaves Google.
    let current = input;
    for (let i = 0; i < 4; i++) {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
          accept: "text/html",
        },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 12000),
      });
      const loc = res.headers.get("location");
      if (loc) {
        current = new URL(loc, current).href;
        if (!/news\.google\.com|google\.com\/url/i.test(current)) return current;
        continue;
      }
      if (res.status >= 200 && res.status < 300) {
        const html = await res.text();
        const decoded = await decodeGoogleNewsFromHtml(current, html);
        if (decoded) return decoded;
      }
      break;
    }
  } catch {
    // keep fallback
  }
  return input;
}

/**
 * @param {string} articleUrl
 * @param {string} html
 */
async function decodeGoogleNewsFromHtml(articleUrl, html) {
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

  let dataP = html.match(/c-wiz[^>]*data-p="([^"]+)"/)?.[1];
  if (!dataP) return null;
  dataP = dataP
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace("%.@.", '["garturlreq",');

  let obj;
  try {
    obj = JSON.parse(dataP);
  } catch {
    return null;
  }

  const payloadBody = [...obj.slice(0, -6), ...obj.slice(-2)];
  const payload = new URLSearchParams({
    "f.req": JSON.stringify([
      [["Fbv4je", JSON.stringify(payloadBody), "null", "generic"]],
    ]),
  });

  const post = await fetch(
    "https://news.google.com/_/DotsSplashUi/data/batchexecute",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": UA,
      },
      body: payload,
      signal: AbortSignal.timeout(12000),
    },
  );
  const text = await post.text();
  try {
    const cleaned = text.replace(/^\)\]\}'\s*/, "");
    const parsed = JSON.parse(cleaned);
    const arrayString = parsed[0][2];
    const article = JSON.parse(arrayString)[1];
    if (typeof article === "string" && /^https?:\/\//i.test(article)) {
      return article;
    }
  } catch {
    return null;
  }
  return null;
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
