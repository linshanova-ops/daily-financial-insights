// scripts/lib/event-calendar-merge.mjs
export function inWindow(date, windowStart, windowEnd) {
  return date >= windowStart && date <= windowEnd;
}

export function eventDedupeKey(ev) {
  const slug = String(ev.event || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ev.date}|${ev.region}|${ev.category}|${slug}`;
}

export function stripBannedUkEuData(events) {
  return events.filter(
    (ev) =>
      !(
        (ev.region === "UK" || ev.region === "EU") &&
        ev.category === "data"
      ),
  );
}

/**
 * Prefer IMAP, then gov, then earnings. Filter to window; ban UK/EU data.
 */
export function mergeCalendarEvents({
  windowStart,
  windowEnd,
  imapEvents = [],
  govEvents = [],
  earningsEvents = [],
}) {
  const buckets = [
    ...imapEvents.map((e) => ({ e, rank: 0 })),
    ...govEvents.map((e) => ({ e, rank: 1 })),
    ...earningsEvents.map((e) => ({ e, rank: 2 })),
  ];
  const byKey = new Map();
  for (const { e, rank } of buckets) {
    if (!e?.date || !inWindow(e.date, windowStart, windowEnd)) continue;
    const key = eventDedupeKey(e);
    const prev = byKey.get(key);
    if (!prev || rank < prev.rank) byKey.set(key, { e, rank });
  }
  const merged = [...byKey.values()].map(({ e }) => e);
  return stripBannedUkEuData(merged).sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.timeBeijing || "99:99").localeCompare(b.timeBeijing || "99:99");
  });
}
