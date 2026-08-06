/**
 * Event Calendar window: briefing date → Friday on or after that date (Beijing
 * calendar). Sat/Sun publish → next Friday.
 */
export function nextFridayOnOrAfter(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Noon UTC avoids DST edge cases; we only need weekday arithmetic.
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  const day = dt.getUTCDay(); // 0 Sun … 5 Fri … 6 Sat
  let add = (5 - day + 7) % 7;
  if (day === 6) add = 6; // Sat → next Fri
  if (day === 0) add = 5; // Sun → next Fri
  dt.setUTCDate(dt.getUTCDate() + add);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function eventWindowForBriefingDate(isoDate: string): {
  windowStart: string;
  windowEnd: string;
} {
  const windowStart = isoDate.trim();
  return {
    windowStart,
    windowEnd: nextFridayOnOrAfter(windowStart),
  };
}
