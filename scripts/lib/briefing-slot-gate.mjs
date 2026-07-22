/**
 * Decide whether a scheduled/cron generate should run for Beijing 08:00 / 20:00.
 *
 * Policy: capture real market data AT/AFTER the hour (not before). Prefer starting
 * within LATE_MINUTES after each hour; if GitHub skipped the whole primary window,
 * MISSED_CATCHUP_HOURS still allows a catch-up until the slot is published.
 *
 * Weekend policy: Beijing Sat/Sun scheduled slots are skipped (cash markets closed;
 * saves Cursor tokens). Friday evening catch-up that spills into Saturday clock is
 * still allowed when slot.date is Friday. Monday covers since Friday close in the
 * agent prompt (crypto + weekend news included).
 *
 * - workflow_dispatch / repository_dispatch+force → always run (manual catch-up)
 * - schedule / repository_dispatch (external cron backup) → slot gate
 */

/** Do not start before the Beijing hour — data must reflect 08:00 / 20:00. */
export const EARLY_MINUTES = 0;

/**
 * Preferred max delay after the Beijing hour for on-time generate (minutes).
 * Keep this modest; missed-slot catch-up covers longer GitHub cron gaps.
 */
export const LATE_MINUTES = 45;

/**
 * If the primary window never fired / never published, allow catch-up for this
 * many hours after slot start. Hourly heartbeat + external cron rely on this.
 * (GitHub schedule is best-effort and has skipped entire windows.)
 */
export const MISSED_CATCHUP_HOURS = 6;

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

/**
 * Weekday short name for a Beijing calendar date (Sun…Sat).
 * Uses noon Beijing on that date (CST, no DST) to avoid date-boundary ambiguity.
 * @param {string} dateStr YYYY-MM-DD
 */
export function beijingWeekdayShort(dateStr) {
  const noonBjAsUtc = new Date(`${dateStr}T04:00:00.000Z`); // 12:00 Asia/Shanghai
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  }).format(noonBjAsUtc);
}

/** Scheduled Cursor generates skip Beijing Sat/Sun (cash markets closed). */
export function isBeijingWeekendDate(dateStr) {
  const day = beijingWeekdayShort(dateStr);
  return day === "Sat" || day === "Sun";
}

/**
 * Monday Beijing open after the weekend skip — prompts must cover since Friday close
 * (crypto + weekend news still matter even though cash equities were shut).
 */
export function isBeijingPostWeekendOpen(dateStr) {
  return beijingWeekdayShort(dateStr) === "Mon";
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
 * Find an unpublished Beijing slot whose start was within the last
 * `catchupHours` (after the primary LATE_MINUTES window).
 * Prefers the most recently started unpublished slot.
 */
export function missedUnpublishedSlot(
  now = new Date(),
  latest = null,
  {
    earlyMinutes = EARLY_MINUTES,
    lateMinutes = LATE_MINUTES,
    catchupHours = MISSED_CATCHUP_HOURS,
  } = {},
) {
  const t = now.getTime();
  const dates = new Set([
    beijingDateString(now),
    beijingDateString(new Date(t - 24 * 60 * 60 * 1000)),
  ]);

  /** @type {null | { id: string, utcHour: number, date: string, start: Date, minutesFromStart: number }} */
  let best = null;

  for (const date of dates) {
    for (const [id, utcHour] of Object.entries(SLOT_UTC_HOURS)) {
      const start = slotStartUtc(id, date);
      const primaryClose = start.getTime() + lateMinutes * 60_000;
      const catchupClose = start.getTime() + catchupHours * 60 * 60_000;
      // Only after primary window ends, and before catch-up deadline
      if (t < primaryClose || t >= catchupClose) continue;
      const slot = {
        id,
        utcHour,
        date,
        start,
        minutesFromStart: (t - start.getTime()) / 60_000,
      };
      if (slotAlreadyPublished(latest, slot, earlyMinutes)) continue;
      if (!best || slot.start.getTime() > best.start.getTime()) best = slot;
    }
  }

  return best;
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

/** Events that must respect the Beijing slot window (unless forceDispatch). */
export function usesSlotGate(eventName, forceDispatch = false) {
  if (eventName === "workflow_dispatch") return false;
  if (eventName === "repository_dispatch" && forceDispatch) return false;
  return eventName === "schedule" || eventName === "repository_dispatch";
}

/**
 * @param {{ eventName: string, now?: Date, latest?: { date?: string, publishedAt?: string } | null, earlyMinutes?: number, lateMinutes?: number, catchupHours?: number, forceDispatch?: boolean }} opts
 */
export function evaluateScheduleGate(opts) {
  const {
    eventName,
    now = new Date(),
    latest = null,
    earlyMinutes = EARLY_MINUTES,
    lateMinutes = LATE_MINUTES,
    catchupHours = MISSED_CATCHUP_HOURS,
    forceDispatch = false,
  } = opts;

  if (!usesSlotGate(eventName, forceDispatch)) {
    return {
      shouldRun: true,
      reason:
        eventName === "repository_dispatch" && forceDispatch
          ? "repository_dispatch force=true (manual catch-up — always run)"
          : `event=${eventName} (manual — always run)`,
      slot: null,
    };
  }

  const primary = activeSlot(now, earlyMinutes, lateMinutes);
  if (primary) {
    if (isBeijingWeekendDate(primary.date)) {
      return {
        shouldRun: false,
        reason: `weekend skip — Beijing ${primary.date} is ${beijingWeekdayShort(primary.date)} (no scheduled Cursor generate; cash markets closed)`,
        slot: primary,
      };
    }
    if (slotAlreadyPublished(latest, primary, earlyMinutes)) {
      return {
        shouldRun: false,
        reason: `${primary.id} slot already published (date=${latest.date} publishedAt=${latest.publishedAt})`,
        slot: primary,
      };
    }
    const when =
      primary.minutesFromStart < 0
        ? `${Math.abs(Math.round(primary.minutesFromStart))}m before`
        : `${Math.round(primary.minutesFromStart)}m after`;
    return {
      shouldRun: true,
      reason: `${primary.id} slot open (${when} ${String(primary.utcHour).padStart(2, "0")}:00 UTC / Beijing hour; briefing date ${primary.date})`,
      slot: primary,
    };
  }

  const missed = missedUnpublishedSlot(now, latest, {
    earlyMinutes,
    lateMinutes,
    catchupHours,
  });
  if (missed) {
    if (isBeijingWeekendDate(missed.date)) {
      return {
        shouldRun: false,
        reason: `weekend skip — Beijing ${missed.date} is ${beijingWeekdayShort(missed.date)} (no scheduled catch-up generate)`,
        slot: missed,
      };
    }
    return {
      shouldRun: true,
      reason: `${missed.id} missed-slot catch-up (${Math.round(missed.minutesFromStart)}m after ${String(missed.utcHour).padStart(2, "0")}:00 UTC; briefing date ${missed.date})`,
      slot: missed,
    };
  }

  return {
    shouldRun: false,
    reason: `outside Beijing 08:00/20:00 windows (0–${lateMinutes}m) and no unpublished slot within ${catchupHours}h catch-up`,
    slot: null,
  };
}
