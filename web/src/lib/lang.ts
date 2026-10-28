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

/** Known market-closes group ids. Anything else, including row names, stays. */
export function groupZh(id: string, en: string): string {
  if (id === "global-equities") return "全球股市";
  if (id === "us-treasuries") return "美国国债";
  if (id === "fx-commodities-crypto") return "外汇 / 商品 / 加密";
  return en;
}
