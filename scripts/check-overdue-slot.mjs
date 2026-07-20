/**
 * Exit 1 when a Beijing publish slot is overdue and still unpublished.
 * Used by overdue-slot-alert.yml so GitHub emails on failure.
 */
import {
  MISSED_CATCHUP_HOURS,
  beijingDateString,
  evaluateScheduleGate,
  slotStartUtc,
} from "./lib/briefing-slot-gate.mjs";

const repo =
  process.env.GITHUB_REPOSITORY || "linshanova-ops/daily-financial-insights";
/** Minutes after slot start before we call it overdue for alerting. */
const OVERDUE_AFTER_MINUTES = Number(process.env.OVERDUE_AFTER_MINUTES || 50);

async function loadLatest() {
  const url = `https://raw.githubusercontent.com/${repo}/main/web/public/data/latest.json`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "syravocado-overdue-slot",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  const now = new Date();
  const latest = await loadLatest();
  const bj = beijingDateString(now);

  for (const id of /** @type {const} */ (["morning", "evening"])) {
    const start = slotStartUtc(id, bj);
    const minutesAfter = (now.getTime() - start.getTime()) / 60_000;
    if (minutesAfter < OVERDUE_AFTER_MINUTES) continue;
    if (minutesAfter > MISSED_CATCHUP_HOURS * 60) continue;

    const decision = evaluateScheduleGate({
      eventName: "schedule",
      now,
      latest,
    });
    // If gate still wants to run this slot, it is unpublished → overdue.
    if (decision.shouldRun && decision.slot?.id === id) {
      console.error(
        `[overdue] ${id} slot for ${bj} is unpublished ${Math.round(minutesAfter)}m after start (latest publishedAt=${latest?.publishedAt || "none"})`,
      );
      console.error(
        "::error::Beijing publish slot overdue — site may be stale. Check Actions → Generate daily briefing, or force repository_dispatch.",
      );
      process.exit(1);
    }
  }

  console.log(
    `[overdue] ok — no overdue unpublished slot (beijing=${bj} latest=${latest?.date || "none"} @ ${latest?.publishedAt || "n/a"})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
