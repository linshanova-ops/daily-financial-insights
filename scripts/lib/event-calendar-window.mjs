/**
 * Event Calendar window: briefing date → **next** Friday (Beijing).
 * Mirror of web/src/lib/event-calendar-window.ts — keep in sync.
 */

export function nextFridayOnOrAfter(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());
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
export function nextWeekFridayAfter(isoDate) {
  const thisFriday = nextFridayOnOrAfter(isoDate);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(thisFriday);
  if (!m) throw new Error(`Invalid ISO date: ${thisFriday}`);
  const dt = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0),
  );
  dt.setUTCDate(dt.getUTCDate() + 7);
  return formatUtcDate(dt);
}

function formatUtcDate(dt) {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function eventWindowForBriefingDate(isoDate) {
  const windowStart = String(isoDate).trim();
  return {
    windowStart,
    windowEnd: nextWeekFridayAfter(windowStart),
  };
}
