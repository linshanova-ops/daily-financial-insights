/** Beijing schedule for twice-daily briefings (08:00 / 20:00 China time). */
export const BRIEFING_PUBLISH_TIMEZONE = "Asia/Shanghai";

/** Format a briefing publishedAt / feed generatedAt for the homepage. */
export function formatPublishedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRIEFING_PUBLISH_TIMEZONE,
    timeZoneName: "short",
  });
}

/** Whole days since publish (UTC), or null if unknown. */
export function daysSincePublished(
  iso?: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = nowMs - date.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / (24 * 3600 * 1000));
}

/** Reader-facing freshness line for the homepage status strip. */
export function freshnessStatusLine(
  iso?: string | null,
  nowMs: number = Date.now(),
): string {
  const days = daysSincePublished(iso, nowMs);
  if (days == null) {
    return "Showing the latest published edition.";
  }
  if (days === 0) {
    return "Latest edition published today.";
  }
  if (days === 1) {
    return "Latest edition published 1 day ago.";
  }
  return `Latest edition published ${days} days ago.`;
}
