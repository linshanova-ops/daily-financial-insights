export type Lang = "en" | "zh";

/**
 * `?lang=` wins when it is zh or en. Otherwise keep a zh page whose link
 * dropped the query, else English (the page as published today).
 */
export function resolveLang(
  query: string | null | undefined,
  dataset?: string | null,
): Lang {
  if (query === "zh" || query === "en") return query;
  if (dataset === "zh") return "zh";
  return "en";
}

export function gradeZh(grade: string): string {
  if (grade === "STRONG") return "强";
  if (grade === "MODERATE") return "中";
  if (grade === "WEAK") return "弱";
  return grade;
}

export function statusZh(status: string): string {
  if (status === "new") return "新";
  if (status === "continuing") return "延续";
  if (status === "escalated") return "升级";
  if (status === "retired") return "结束";
  return status;
}

/** Known market-closes group ids. Unknown ids stay as published. */
export function groupZh(id: string, en: string): string {
  if (id === "global-equities") return "全球股市";
  if (id === "us-treasuries") return "美国国债";
  if (id === "fx-commodities-crypto") return "外汇 / 商品 / 加密";
  return en;
}

/** Market-closes row ids. Unknown rows stay as published. Brent stays the Yahoo print. */
const ASSET_ZH: Record<string, string> = {
  spx: "标普500",
  nasdaq: "纳斯达克综合指数",
  vix: "标普500波动率指数",
  nikkei: "日经225",
  kospi: "韩国综合指数",
  hsi: "恒生指数",
  hstech: "恒生科技指数",
  shanghai: "上证综指",
  us02y: "美国2年期收益率",
  us05y: "美国5年期收益率",
  us10y: "美国10年期收益率",
  us30y: "美国30年期收益率",
  usdjpy: "美元/日元",
  usdcny: "美元/人民币",
  gold: "黄金期货",
  brent: "布伦特期货（Yahoo）",
  btc: "比特币/美元",
  "btc-funding": "比特币资金费率",
};

export function assetZh(id: string, en: string): string {
  return ASSET_ZH[id] ?? en;
}
