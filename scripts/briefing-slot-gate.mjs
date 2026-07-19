/**
 * GitHub Actions entry: write should_run (+ briefing_date / slot_id) to GITHUB_OUTPUT.
 * Scheduled runs open ~20m before Beijing 08:00 / 20:00 through ~25m after.
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

function appendOutput(lines) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${lines.filter(Boolean).join("\n")}\n`);
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
      `[slot-gate] slot=${decision.slot.id} date=${decision.slot.date} minutesFromStart=${decision.slot.minutesFromStart.toFixed(1)}`,
    );
  }

  appendOutput([
    `should_run=${decision.shouldRun ? "true" : "false"}`,
    decision.slot ? `slot_id=${decision.slot.id}` : "slot_id=",
    decision.slot ? `briefing_date=${decision.slot.date}` : "briefing_date=",
  ]);

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
