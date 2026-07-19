/**
 * Decide whether a scheduled generate should run for the Beijing 08:00 / 20:00 slots.
 *
 * GitHub's `schedule` cron is often minutes–hours late. We poll every few minutes and
 * only proceed inside a short window after each slot, skipping if that slot already
 * published on main.
 */

/** Minutes after slot start during which a scheduled run may still fire. */
export const SLOT_WINDOW_MINUTES = 25;

/** UTC hours for Beijing 08:00 and 20:00 (CST, no DST). */
export const SLOT_UTC_HOURS = Object.freeze({
  morning: 0,
  evening: 12,
});

export function utcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * @returns {{ id: 'morning'|'evening', utcHour: number, minutesAfterStart: number, date: string } | null}
 */
export function activeSlot(now = new Date(), windowMinutes = SLOT_WINDOW_MINUTES) {
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  for (const [id, utcHour] of Object.entries(SLOT_UTC_HOURS)) {
    const start = utcHour * 60;
    const delta = minutes - start;
    if (delta >= 0 && delta < windowMinutes) {
      return {
        id,
        utcHour,
        minutesAfterStart: delta,
        date: utcDateString(now),
      };
    }
  }
  return null;
}

/** UTC instant when the slot opened on `now`'s UTC calendar day. */
export function slotStartUtc(slot, now = new Date()) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      slot.utcHour,
      0,
      0,
      0,
    ),
  );
}

/**
 * True when main already has a briefing for this slot's date published at/after slot start.
 * @param {{ date?: string, publishedAt?: string } | null} latest
 */
export function slotAlreadyPublished(latest, slot, now = new Date()) {
  if (!latest?.publishedAt || !latest?.date) return false;
  if (latest.date !== slot.date) return false;
  const pub = new Date(latest.publishedAt);
  if (Number.isNaN(pub.getTime())) return false;
  return pub.getTime() >= slotStartUtc(slot, now).getTime();
}

/**
 * @param {{ eventName: string, now?: Date, latest?: { date?: string, publishedAt?: string } | null, windowMinutes?: number }} opts
 */
export function evaluateScheduleGate(opts) {
  const {
    eventName,
    now = new Date(),
    latest = null,
    windowMinutes = SLOT_WINDOW_MINUTES,
  } = opts;

  // Manual / dispatch always run.
  if (eventName !== "schedule") {
    return {
      shouldRun: true,
      reason: `event=${eventName} (not schedule — always run)`,
      slot: null,
    };
  }

  const slot = activeSlot(now, windowMinutes);
  if (!slot) {
    return {
      shouldRun: false,
      reason: `outside Beijing 08:00/20:00 windows (±${windowMinutes}m UTC)`,
      slot: null,
    };
  }

  if (slotAlreadyPublished(latest, slot, now)) {
    return {
      shouldRun: false,
      reason: `${slot.id} slot already published (date=${latest.date} publishedAt=${latest.publishedAt})`,
      slot,
    };
  }

  return {
    shouldRun: true,
    reason: `${slot.id} slot open (${slot.minutesAfterStart}m after ${String(slot.utcHour).padStart(2, "0")}:00 UTC)`,
    slot,
  };
}
