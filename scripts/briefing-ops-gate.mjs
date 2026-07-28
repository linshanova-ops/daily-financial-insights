#!/usr/bin/env node
/**
 * GitHub Actions: write cursor_auto / force outputs from briefing-ops.json.
 */
import fs from "node:fs";
import {
  loadBriefingOps,
  shouldRunCursorGenerate,
} from "./lib/briefing-ops.mjs";

const eventName = process.env.GITHUB_EVENT_NAME || "schedule";
const forceCursor =
  process.env.DISPATCH_FORCE_CURSOR === "true" ||
  process.env.DISPATCH_FORCE_CURSOR === "1";
const outputPath = process.env.GITHUB_OUTPUT;

const ops = loadBriefingOps();
const decision = shouldRunCursorGenerate({
  ops,
  eventName,
  forceCursor,
});

function appendOutput(lines) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${lines.filter(Boolean).join("\n")}\n`);
}

console.log(`[briefing-ops] ${ops.reason}`);
console.log(`[briefing-ops] cursor_auto=${decision.run} (${decision.reason})`);
if (ops.note) console.log(`[briefing-ops] note: ${ops.note}`);

appendOutput([
  `cursor_auto=${decision.run ? "true" : "false"}`,
  `cursor_auto_reason=${decision.reason.replace(/\n/g, " ")}`,
  `resume_on=${ops.cursorAutoResumeOn || ""}`,
]);

if (!decision.run) {
  console.log(
    `::notice::Cursor auto-generate OFF — ${decision.reason}. Publish briefings manually (PR with web/content/briefings/YYYY-MM-DD.md). Override: client_payload.force_cursor=true.`,
  );
}
