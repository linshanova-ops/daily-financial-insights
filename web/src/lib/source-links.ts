/** Canonical primary-source links for key prints and desks. */
export interface SourceLink {
  label: string;
  href: string;
}

/** Match substrings in free-text source lists → clickable URLs. */
export const SOURCE_CATALOG: SourceLink[] = [
  {
    label: "BLS CPI",
    href: "https://www.bls.gov/news.release/cpi.nr0.htm",
  },
  {
    label: "BLS PPI",
    href: "https://www.bls.gov/news.release/ppi.nr0.htm",
  },
  {
    label: "Bureau of Labor Statistics",
    href: "https://www.bls.gov/",
  },
  {
    label: "Federal Reserve",
    href: "https://www.federalreserve.gov/",
  },
  {
    label: "US Treasury",
    href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve",
  },
  {
    label: "CME FedWatch",
    href: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
  },
  {
    label: "Yahoo Finance",
    href: "https://finance.yahoo.com/",
  },
  {
    label: "NBS",
    href: "https://www.stats.gov.cn/english/",
  },
  {
    label: "PBOC",
    href: "http://www.pbc.gov.cn/",
  },
  {
    label: "华尔街见闻",
    href: "https://wallstreetcn.com/",
  },
  {
    label: "Caixin",
    href: "https://www.caixinglobal.com/",
  },
  {
    label: "第一财经",
    href: "https://www.yicai.com/",
  },
  {
    label: "Yicai",
    href: "https://www.yicai.com/",
  },
  {
    label: "BlockBeats",
    href: "https://www.theblockbeats.info/",
  },
  {
    label: "ASML IR",
    href: "https://www.asml.com/en/investors",
  },
  {
    label: "SEC",
    href: "https://www.sec.gov/",
  },
  {
    label: "Reuters",
    href: "https://www.reuters.com/",
  },
  {
    label: "CNBC",
    href: "https://www.cnbc.com/",
  },
  {
    label: "Bloomberg",
    href: "https://www.bloomberg.com/",
  },
  {
    label: "Yonhap",
    href: "https://en.yna.co.kr/",
  },
];

/** Default key prints for the current macro tape when briefing omits keySources. */
export const DEFAULT_KEY_SOURCES: SourceLink[] = [
  {
    label: "BLS — June CPI",
    href: "https://www.bls.gov/news.release/archives/cpi_07142026.htm",
  },
  {
    label: "BLS — June PPI",
    href: "https://www.bls.gov/news.release/archives/ppi_07152026.htm",
  },
  {
    label: "US Treasury — yield curve",
    href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve",
  },
  {
    label: "NBS — China GDP",
    href: "https://www.stats.gov.cn/english/",
  },
  {
    label: "PBOC — open market ops",
    href: "http://www.pbc.gov.cn/",
  },
  {
    label: "Federal Reserve",
    href: "https://www.federalreserve.gov/",
  },
  {
    label: "CME FedWatch",
    href: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
  },
  {
    label: "Yahoo Finance",
    href: "https://finance.yahoo.com/",
  },
  {
    label: "Caixin Global",
    href: "https://www.caixinglobal.com/",
  },
  {
    label: "第一财经 (Yicai)",
    href: "https://www.yicai.com/",
  },
];

export function linkifySources(text: string): Array<string | SourceLink> {
  if (!text?.trim()) return [];

  // Longer labels first so "Bureau of Labor Statistics" wins over fragments.
  const catalog = [...SOURCE_CATALOG].sort(
    (a, b) => b.label.length - a.label.length,
  );
  const parts: Array<string | SourceLink> = [];
  let remaining = text;
  let guard = 0;

  while (remaining.length && guard < 40) {
    guard += 1;
    let best: { index: number; link: SourceLink } | null = null;
    for (const link of catalog) {
      const index = remaining.indexOf(link.label);
      if (index === -1) continue;
      if (!best || index < best.index) best = { index, link };
    }
    if (!best) {
      parts.push(remaining);
      break;
    }
    if (best.index > 0) parts.push(remaining.slice(0, best.index));
    parts.push(best.link);
    remaining = remaining.slice(best.index + best.link.label.length);
  }

  return parts;
}
