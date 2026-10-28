export function formatBriefingDate(
  date: string,
  lang: "en" | "zh" = "en",
): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
