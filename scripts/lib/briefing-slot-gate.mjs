/**
 * Decide whether a scheduled generate should run for Beijing 08:00 / 20:00.
 *
 * Policy: capture real market data AT/AFTER the hour (not before), and finish
 * publish within LATE_MINUTES (default 20). We poll every few minutes; the gate
 * opens at the Beijing hour and stays open for the late window only.
 */

/** Do not start before the Beijing hour — data must reflect 08:00 / 20:00. */
export const EARLY_MINUTES = 0;

/** Max delay after the Beijing hour to still start generate (minutes). */
export const LATE_MINUTES = 20;

/** @deprecated use LATE_MINUTES */
export const SLOT_WINDOW_MINUTES = LATE_MINUTES;

/** UTC hours for Beijing 08:00 and 20:00 (CST, no DST). */
export const SLOT_UTC_HOURS = Object.freeze({
  morning: 0,
  evening: 12,
});

/** Calendar date in Asia/Shanghai (YYYY-MM-DD). */
export function beijingDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function utcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** UTC instant when Beijing 08:00 / 20:00 lands for a Beijing calendar date. */
export function slotStartUtc(slotIdOrSlot, dateStr) {
  const utcHour =
    typeof slotIdOrSlot === "string"
      ? SLOT_UTC_HOURS[slotIdOrSlot]
      : slotIdOrSlot.utcHour;
  const date =
    dateStr || (typeof slotIdOrSlot === "object" ? slotIdOrSlot.date : null);
  if (utcHour == null || !date) {
    throw new Error("slotStartUtc requires slot id/hour and YYYY-MM-DD date");
  }
  return new Date(`${date}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
}

/**
 * @returns {{ id: 'morning'|'evening', utcHour: number, date: string, start: Date, minutesFromStart: number } | null}
 */
export function activeSlot(
  now = new Date(),
  earlyMinutes = EARLY_MINUTES,
  lateMinutes = LATE_MINUTES,
) {
  const dates = new Set([
    beijingDateString(now),
    beijingDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
  ]);

  /** @type {null | { id: string, utcHour: number, date: string, start: Date, minutesFromStart: number, dist: number }} */
  let best = null;

  for (const date of dates) {
    for (const [id, utcHour] of Object.entries(SLOT_UTC_HOURS)) {
      const start = slotStartUtc(id, date);
      const earlyOpen = start.getTime() - earlyMinutes * 60_000;
      const lateClose = start.getTime() + lateMinutes * 60_000;
      const t = now.getTime();
      if (t < earlyOpen || t >= lateClose) continue;
      const minutesFromStart = (t - start.getTime()) / 60_000;
      const dist = Math.abs(minutesFromStart);
      const candidate = {
        id,
        utcHour,
        date,
        start,
        minutesFromStart,
        dist,
      };
      if (!best || candidate.dist < best.dist) best = candidate;
    }
  }

  if (!best) return null;
  return {
    id: best.id,
    utcHour: best.utcHour,
    date: best.date,
    start: best.start,
    minutesFromStart: best.minutesFromStart,
  };
}

/**
 * True when main already has this slot's briefing published at/after slot start.
 * @param {{ date?: string, publishedAt?: string } | null} latest
 */
export function slotAlreadyPublished(
  latest,
  slot,
  earlyMinutes = EARLY_MINUTES,
) {
  if (!latest?.publishedAt || !latest?.date) return false;
  if (latest.date !== slot.date) return false;
  const pub = new Date(latest.publishedAt);
  if (Number.isNaN(pub.getTime())) return false;
  const earlyOpen = slot.start.getTime() - earlyMinutes * 60_000;
  return pub.getTime() >= earlyOpen;
}

/**
 * @param {{ eventName: string, now?: Date, latest?: { date?: string, publishedAt?: string } | null, earlyMinutes?: number, lateMinutes?: number }} opts
 */
export function evaluateScheduleGate(opts) {
  const {
    eventName,
    now = new Date(),
    latest = null,
    earlyMinutes = EARLY_MINUTES,
    lateMinutes = LATE_MINUTES,
  } = opts;

  if (eventName !== "schedule") {
    return {
      shouldRun: true,
      reason: `event=${eventName} (not schedule — always run)`,
      slot: null,
    };
  }

  const slot = activeSlot(now, earlyMinutes, lateMinutes);
  if (!slot) {
    return {
      shouldRun: false,
      reason: `outside Beijing 08:00/20:00 windows (0–${lateMinutes}m after the hour)`,
      slot: null,
    };
  }

  if (slotAlreadyPublished(latest, slot, earlyMinutes)) {
    return {
      shouldRun: false,
      reason: `${slot.id} slot already published (date=${latest.date} publishedAt=${latest.publishedAt})`,
      slot,
    };
  }

  const when =
    slot.minutesFromStart < 0
      ? `${Math.abs(Math.round(slot.minutesFromStart))}m before`
      : `${Math.round(slot.minutesFromStart)}m after`;

  return {
    shouldRun: true,
    reason: `${slot.id} slot open (${when} ${String(slot.utcHour).padStart(2, "0")}:00 UTC / Beijing hour; briefing date ${slot.date})`,
    slot,
  };
}
