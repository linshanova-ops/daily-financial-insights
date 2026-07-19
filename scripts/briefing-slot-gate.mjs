/**
 * GitHub Actions entry: exit 0 always; write should_run to GITHUB_OUTPUT.
 * Scheduled runs only proceed inside Beijing 08:00 / 20:00 windows.
 */
import fs from "node:fs";
import { evaluateScheduleGate } from "./lib/briefing-slot-gate.mjs";

const eventName = process.env.GITHUB_EVENT_NAME || "schedule";
const repo =
  process.env.GITHUB_REPOSITORY || "linshanova-ops/daily-financial-insights";
const outputPath = process.env.GITHUB_OUTPUT;

async function loadLatestFromMain() {
  const url = `https://raw.githubusercontent.com/${repo}/main/web/public/data/latest.json`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "syravocado-slot-gate",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(
        `[slot-gate] latest.json HTTP ${res.status} — treating as unpublished`,
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[slot-gate] latest.json fetch failed: ${err?.message || err}`);
    return null;
  }
}

async function main() {
  const latest = eventName === "schedule" ? await loadLatestFromMain() : null;
  const decision = evaluateScheduleGate({
    eventName,
    now: new Date(),
    latest,
  });

  console.log(`[slot-gate] event=${eventName}`);
  console.log(`[slot-gate] ${decision.reason}`);
  if (decision.slot) {
    console.log(
      `[slot-gate] slot=${decision.slot.id} date=${decision.slot.date} +${decision.slot.minutesAfterStart}m`,
    );
  }

  if (outputPath) {
    fs.appendFileSync(
      outputPath,
      `should_run=${decision.shouldRun ? "true" : "false"}\n`,
    );
  }
  console.log(
    `[slot-gate] should_run=${decision.shouldRun ? "true" : "false"}`,
  );

  if (!decision.shouldRun) {
    console.log(
      "::notice::Skipping generate — outside Beijing publish window or slot already done.",
    );
  }
}

main().catch((err) => {
  console.error(`[slot-gate] ${err?.stack || err}`);
  process.exit(1);
});
