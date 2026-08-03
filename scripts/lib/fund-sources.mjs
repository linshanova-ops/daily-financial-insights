/**
 * Fund signal source registry — designated vs secondary vs weak.
 * Inspired by fund-signal-monitor style: only designated/secondary stay
 * prominent; weak aggregators (13F spam, ownership stubs) are excluded.
 */

/** Primary trade-press RSS / desks we intentionally scan. */
export const DESIGNATED_SOURCES = [
  {
    id: "hedgeweek",
    label: "Hedgeweek",
    tier: "designated",
    href: "https://www.hedgeweek.com/feed/",
    note: "指定信源 RSS — hedge-fund trade press",
  },
  {
    id: "hedgeco",
    label: "HedgeCo",
    tier: "designated",
    href: "https://www.hedgeco.net/news/feed/",
    note: "指定信源 RSS — hedge-fund trade wire",
  },
];

/**
 * Credible publishers allowed when discovered via Google News.
 * Unknown publishers fall through to "weak" (not auto-confirmed).
 */
export const SECONDARY_SOURCE_PATTERNS = [
  /hedgeweek/i,
  /hedgeco/i,
  /\bbloomberg\b/i,
  /\breuters\b/i,
  /financial times|\bft\.com\b/i,
  /wall street journal|\bwsj\b/i,
  /new york times|\bnytimes\b|\bnyt\b/i,
  /business insider|\binsider\.com\b/i,
  /seeking alpha/i,
  /financial news|fnlondon/i,
  /with intelligence|withintelligence/i,
  /funds global/i,
  /absolute return|absolutewith/i,
  /institutional investor/i,
  /pensions?\s*&\s*investments|\bpionline\b/i,
  /alternative fund insight/i,
  /\bafr\b|australian financial review/i,
  /citywire/i,
];

/** Lower rank = preferred when collapsing same-story duplicates. */
const SOURCE_PRESTIGE = [
  { rank: 10, re: /hedgeweek|hedgeco/i },
  { rank: 20, re: /\bbloomberg\b/i },
  { rank: 30, re: /wall street journal|\bwsj\b/i },
  { rank: 40, re: /financial times|\bft\.com\b/i },
  { rank: 50, re: /\breuters\b/i },
  { rank: 60, re: /new york times|\bnytimes\b|\bnyt\b/i },
  { rank: 70, re: /business insider|\binsider\.com\b/i },
  { rank: 80, re: /seeking alpha/i },
  { rank: 90, re: /financial news|fnlondon|with intelligence|institutional investor|citywire|\bafr\b|australian financial review|pionline|funds global|absolute return/i },
];

/** Titles / hosts that create false or non-actionable “hits”. */
export const WEAK_SIGNAL_PATTERNS = [
  /marketbeat/i,
  /tradingkey/i,
  /ad-hoc-news/i,
  /stock titan/i,
  /quiver ?quant/i,
  /makes new \$[\d.,]+\s*million investment/i,
  /makes new investment in /i,
  /position (?:lifted|raised|cut|sold) by /i,
  /shareholder structure:/i,
  /institutional holdings/i,
  /13f|form 13f|sec filing/i,
  /ord shs class [ab]\b/i,
  /acquisition (?:i{1,3}|iv|v) (?:corp|ord)/i,
];

/**
 * @param {{ source?: string, title?: string, href?: string | null }} row
 * @returns {"designated" | "secondary" | "weak"}
 */
export function classifySourceTier(row) {
  const blob = [row?.source, row?.title, row?.href].filter(Boolean).join("\n");
  if (WEAK_SIGNAL_PATTERNS.some((re) => re.test(blob))) return "weak";
  if (
    DESIGNATED_SOURCES.some(
      (s) =>
        s.label.toLowerCase() === String(row?.source || "").toLowerCase() ||
        (row?.href && row.href.includes(s.id)),
    )
  ) {
    return "designated";
  }
  if (SECONDARY_SOURCE_PATTERNS.some((re) => re.test(blob))) return "secondary";
  // Unknown Google News publisher — not on the allowlist
  return "weak";
}

export function sourceTierLabel(tier) {
  if (tier === "designated") return "指定信源";
  if (tier === "secondary") return "公开转载";
  return "弱信源";
}

/** Prestige score for picking a canonical cite within a story cluster (lower = better). */
export function sourcePrestigeRank(row) {
  const tier = classifySourceTier(row);
  if (tier === "weak") return 1000;
  const blob = [row?.source, row?.title, row?.href].filter(Boolean).join("\n");
  if (tier === "designated") return 5;
  for (const entry of SOURCE_PRESTIGE) {
    if (entry.re.test(blob)) return entry.rank;
  }
  return 200;
}

/** Whether a row may enter the confirmed feed. */
export function isConfirmableSource(row) {
  const tier = classifySourceTier(row);
  return tier === "designated" || tier === "secondary";
}
