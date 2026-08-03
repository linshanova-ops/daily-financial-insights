/**
 * Pure helpers for Fund signal matching / confidence.
 * Used by scan-fund-signals.mjs and unit tests.
 */

import { sourcePrestigeRank } from "./fund-sources.mjs";

/** Known short brands keyed by official universe name. */
export const KNOWN_FUND_BRANDS = {
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
  "III Capital": ["III Capital"],
  "Man Group": ["Man Group"],
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

/** @param {string} name */
function buildAliasSet(name) {
  const base = String(name || "").trim();
  if (!base) return { aliases: [], knownShort: new Set(), knownForFund: [] };
  const aliases = new Set([base]);

  // Drop common legal / corporate suffixes
  const short = base
    .replace(
      /\b(Investment Group|Asset Management|Capital Partners|Capital Management|Capital|Management|Partners|Associates|Corporation|International|Group|Investments|Advisors)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  // Require ≥4 chars for stripped stems so "III Capital" / "Man Group"
  // do not create false matches on "III" SPACs or "Man" as a common word.
  if (short.length >= 4) aliases.add(short);

  const knownForFund = KNOWN_FUND_BRANDS[base] || [];
  const knownShort = new Set(
    Object.values(KNOWN_FUND_BRANDS)
      .flat()
      .map((s) => s.toLowerCase()),
  );
  for (const a of knownForFund) aliases.add(a);

  return { aliases: [...aliases], knownShort, knownForFund };
}

/** @param {string} name */
export function fundAliases(name) {
  return buildAliasSet(name).aliases;
}

/**
 * Pick one Google News query term per fund.
 * Prefer known brands (map order); avoid ultra-short generic tokens.
 * @param {string} name
 */
export function primarySearchAlias(name) {
  const base = String(name || "").trim();
  if (!base) return "";
  const { aliases, knownShort, knownForFund } = buildAliasSet(base);

  const isSearchable = (a) => {
    if (!a) return false;
    if (a.length >= 4) return true;
    // Allow short ticker-style brands (LMR, QRT, BAM) when explicitly known
    if (/^[A-Z]{2,5}$/.test(a) && knownShort.has(a.toLowerCase())) return true;
    return false;
  };

  for (const a of knownForFund) {
    if (isSearchable(a)) return a;
  }

  const good = aliases
    .filter(isSearchable)
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  return good[0] || base;
}

/**
 * Build the de-duplicated Google News alias list for a monitored set.
 * Every fund must map to an alias that appears in the returned list
 * (shared brands like Two Sigma intentionally collide).
 * @param {{ name: string }[]} monitored
 */
export function googleNewsSearchAliases(monitored) {
  const aliases = [];
  const seen = new Set();
  const uncovered = [];
  for (const fund of monitored) {
    const alias = primarySearchAlias(fund?.name);
    if (!alias) {
      uncovered.push(fund?.name || "(missing name)");
      continue;
    }
    const key = alias.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      aliases.push(alias);
    }
  }
  return { aliases, uncovered, monitoredCount: monitored.length };
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
    // Block ultra-short generic stems (except known ticker brands like LMR/QRT).
    if (
      alias.length < 4 &&
      !built.knownShort.has(alias.toLowerCase())
    ) {
      continue;
    }
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
      title: decodeHtmlEntities(stripTags(title)),
      link: decodeHtmlEntities(stripTags(link)),
      pubDate,
      summary: decodeHtmlEntities(stripTags(summary)).slice(0, 400),
      source: publisherName
        ? decodeHtmlEntities(stripTags(publisherName))
        : sourceLabel,
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

/**
 * Decode HTML/XML entities in RSS titles (named + numeric).
 * Fixes feeds that emit `trader&#8217;s` instead of `trader's`.
 * @param {string} s
 */
export function decodeHtmlEntities(s) {
  return String(s || "")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function signalDedupKey(title, fund) {
  return `${String(title || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()}::${String(fund || "")
    .toLowerCase()
    .trim()}`;
}

const STORY_STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "among",
  "being",
  "could",
  "deal",
  "deals",
  "exclusive",
  "following",
  "from",
  "fund",
  "funds",
  "helped",
  "into",
  "most",
  "over",
  "says",
  "sources",
  "stock",
  "stocks",
  "their",
  "there",
  "these",
  "those",
  "through",
  "under",
  "until",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
]);

/**
 * Distinctive title tokens for same-story clustering (fund name stripped).
 * @param {string} title
 * @param {string} fund
 */
export function storyFingerprintTokens(title, fund) {
  let t = cleanHeadline(title).toLowerCase();
  for (const alias of fundAliases(fund)) {
    if (!alias || alias.length < 2) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return [
    ...new Set(
      t
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !STORY_STOPWORDS.has(w)),
    ),
  ];
}

const STORY_THEME_TOKENS = new Set([
  "awareness",
  "equity",
  "holdings",
  "losses",
  "portfolio",
  "rescue",
  "rescued",
  "rout",
  "swoop",
  "unwind",
]);

function stemToken(tok) {
  return String(tok || "").replace(/'s$/i, "").replace(/s$/i, "");
}

/**
 * Whether two headlines are the same underlying story for one fund.
 * @param {string} titleA
 * @param {string} titleB
 * @param {string} fund
 */
export function isSameFundStory(titleA, titleB, fund) {
  const a = storyFingerprintTokens(titleA, fund);
  const b = storyFingerprintTokens(titleB, fund);
  if (!a.length || !b.length) return false;
  const stemmedA = [...new Set(a.map(stemToken))];
  const stemmedB = new Set(b.map(stemToken));
  const shared = stemmedA.filter((tok) => stemmedB.has(tok));
  const union = stemmedA.length + stemmedB.size - shared.length;
  const jaccard = shared.length / Math.max(union, 1);
  const weight = shared.reduce((sum, tok) => sum + tok.length, 0);
  if (shared.length >= 2 && (jaccard >= 0.28 || weight >= 16)) return true;

  // Soft path: one rare long entity (e.g. "situational") + deal-theme overlap
  // covers "Situational's holdings" vs "Situational Awareness portfolio".
  const longShared = shared.filter((tok) => tok.length >= 10);
  if (!longShared.length) return false;
  const themesA = a.filter(
    (tok) => STORY_THEME_TOKENS.has(tok) || STORY_THEME_TOKENS.has(stemToken(tok)),
  );
  const themesB = b.filter(
    (tok) => STORY_THEME_TOKENS.has(tok) || STORY_THEME_TOKENS.has(stemToken(tok)),
  );
  return themesA.length > 0 && themesB.length > 0;
}

/**
 * Collapse same-story duplicates for one fund; keep best prestige cite.
 * Related outlets are attached on the canonical row.
 * @param {object[]} signals
 */
export function dedupeStoryClusters(signals) {
  const rows = Array.isArray(signals) ? [...signals] : [];
  const byFund = new Map();
  for (const row of rows) {
    const fund = String(row?.fund || "").trim() || "(unknown)";
    if (!byFund.has(fund)) byFund.set(fund, []);
    byFund.get(fund).push(row);
  }

  const out = [];
  for (const [, group] of byFund) {
    const clusters = [];
    for (const row of group) {
      let placed = false;
      for (const cluster of clusters) {
        if (isSameFundStory(cluster[0].title, row.title, row.fund)) {
          cluster.push(row);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([row]);
    }

    for (const cluster of clusters) {
      cluster.sort((a, b) => {
        const pr =
          sourcePrestigeRank(a) - sourcePrestigeRank(b) ||
          String(b.date || "").localeCompare(String(a.date || ""));
        return pr;
      });
      const [canonical, ...rest] = cluster;
      if (!rest.length) {
        out.push(canonical);
        continue;
      }
      const related = [];
      const seenSource = new Set([
        String(canonical.source || "")
          .toLowerCase()
          .trim(),
      ]);
      for (const row of rest) {
        const srcKey = String(row.source || "Related")
          .toLowerCase()
          .trim();
        if (seenSource.has(srcKey)) continue;
        seenSource.add(srcKey);
        related.push({
          source: row.source || "Related",
          href: row.href || null,
          title: row.title || null,
        });
        if (related.length >= 6) break;
      }
      out.push({
        ...canonical,
        relatedSources: related.length ? related : undefined,
      });
    }
  }

  return out.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
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
