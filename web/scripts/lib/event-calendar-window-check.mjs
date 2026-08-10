/**
 * Latest briefing eventCalendar.windowEnd must equal helper
 * (briefing day → next Friday = this week + next).
 */
import fs from "node:fs";
import path from "node:path";
import { eventWindowForBriefingDate } from "../../../scripts/lib/event-calendar-window.mjs";

export function checkLatestEventCalendarWindow(webRoot) {
  const latestPath = path.join(webRoot, "public/data/latest.json");
  if (!fs.existsSync(latestPath)) {
    return { ok: true, skipped: true };
  }
  const briefing = JSON.parse(fs.readFileSync(latestPath, "utf8"));
  const cal = briefing.eventCalendar;
  if (!cal?.windowStart || !cal?.windowEnd) {
    return { ok: true, skipped: true };
  }
  const expected = eventWindowForBriefingDate(briefing.date);
  if (
    cal.windowStart !== expected.windowStart ||
    cal.windowEnd !== expected.windowEnd
  ) {
    return {
      ok: false,
      message:
        `eventCalendar window ${cal.windowStart}→${cal.windowEnd} ` +
        `!= expected ${expected.windowStart}→${expected.windowEnd} ` +
        `(briefing ${briefing.date}; end = Friday after Friday-on-or-after start)`,
    };
  }
  return { ok: true };
}
