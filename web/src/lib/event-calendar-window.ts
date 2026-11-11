/**
 * Event Calendar window: briefing date → **next** Friday (Beijing).
 * "This Friday" = Friday on/after D; window ends the Friday after that
 * (so a Thursday publish looks through next week’s Friday, not tomorrow).
 */
export function nextFridayOnOrAfter(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0 Sun … 5 Fri … 6 Sat
  const add = (5 - day + 7) % 7;
  dt.setUTCDate(dt.getUTCDate() + add);
  return formatUtcDate(dt);
}

/** Friday after the Friday-on-or-after `isoDate` (always +7 days from that Friday). */
export function nextWeekFridayAfter(isoDate: string): string {
  const thisFriday = nextFridayOnOrAfter(isoDate);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(thisFriday);
  if (!m) throw new Error(`Invalid ISO date: ${thisFriday}`);
  const dt = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0),
  );
  dt.setUTCDate(dt.getUTCDate() + 7);
  return formatUtcDate(dt);
}

function formatUtcDate(dt: Date): string {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type CalendarRow = { date: string; timeBeijing?: string; timing?: "all-day" | "tbd" | "unconfirmed"; category?: string };
export type CalendarStatus = "all-day" | "tbd" | "unconfirmed" | null;

export function calendarStatus(row: CalendarRow): CalendarStatus {
  if (row.timeBeijing) return null;
  return row.timing ?? (row.category === "holiday" ? "all-day" : "tbd");
}

/**
 * Drops rows timed before the issue's publishedAt (archives keep their own clock),
 * then sorts by date and time; all-day leads its day, untimed rows trail it.
 */
export function sortCalendar<T extends CalendarRow>(rows: T[], publishedAt?: string | null): T[] {
  const pub = publishedAt ? Date.parse(publishedAt) : NaN;
  const key = (r: T) => `${r.date}${r.timeBeijing || (calendarStatus(r) === "all-day" ? "00:00" : "99:99")}`;
  return rows
    .filter((r) => !r.timeBeijing || !(Date.parse(`${r.date}T${r.timeBeijing}:00+08:00`) < pub))
    .sort((a, b) => key(a).localeCompare(key(b)));
}

export function eventWindowForBriefingDate(isoDate: string): {
  windowStart: string;
  windowEnd: string;
} {
  const windowStart = isoDate.trim();
  return {
    windowStart,
    windowEnd: nextWeekFridayAfter(windowStart),
  };
}
