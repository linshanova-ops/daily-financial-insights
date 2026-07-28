/**
 * Briefing ops flags (manual vs Cursor auto-generate).
 * Source of truth: web/content/briefing-ops.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OPS_PATH = path.join(
  __dirname,
  "../../web/content/briefing-ops.json",
);

/**
 * @param {string} [opsPath]
 * @param {Date} [now]
 * @returns {{
 *   cursorAutoGenerate: boolean,
 *   cursorAutoResumeOn: string | null,
 *   note: string,
 *   reason: string,
 * }}
 */
export function loadBriefingOps(opsPath = DEFAULT_OPS_PATH, now = new Date()) {
  let raw = {
    cursorAutoGenerate: true,
    cursorAutoResumeOn: null,
    note: "",
  };
  try {
    if (fs.existsSync(opsPath)) {
      raw = { ...raw, ...JSON.parse(fs.readFileSync(opsPath, "utf8")) };
    }
  } catch (err) {
    return {
      cursorAutoGenerate: false,
      cursorAutoResumeOn: null,
      note: "",
      reason: `briefing-ops.json unreadable (${err?.message || err}) — defaulting to manual`,
    };
  }

  const resumeOn = raw.cursorAutoResumeOn
    ? String(raw.cursorAutoResumeOn).slice(0, 10)
    : null;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  if (raw.cursorAutoGenerate === false) {
    if (resumeOn && today >= resumeOn) {
      return {
        cursorAutoGenerate: true,
        cursorAutoResumeOn: resumeOn,
        note: String(raw.note || ""),
        reason: `cursorAutoResumeOn ${resumeOn} reached — auto generate re-enabled`,
      };
    }
    return {
      cursorAutoGenerate: false,
      cursorAutoResumeOn: resumeOn,
      note: String(raw.note || ""),
      reason: resumeOn
        ? `manual mode until ${resumeOn} (Cursor token save)`
        : "manual mode (cursorAutoGenerate=false)",
    };
  }

  return {
    cursorAutoGenerate: true,
    cursorAutoResumeOn: resumeOn,
    note: String(raw.note || ""),
    reason: "cursorAutoGenerate=true",
  };
}

/** True when Actions may call Agent.create for this event. */
export function shouldRunCursorGenerate({
  ops,
  eventName,
  forceCursor = false,
} = {}) {
  if (forceCursor) {
    return {
      run: true,
      reason: "force_cursor=true (explicit override)",
    };
  }
  if (!ops?.cursorAutoGenerate) {
    return {
      run: false,
      reason: ops?.reason || "manual mode — skip Cursor Agent.create",
    };
  }
  if (
    eventName === "schedule" ||
    eventName === "repository_dispatch" ||
    eventName === "workflow_dispatch"
  ) {
    return { run: true, reason: `auto allowed for event=${eventName}` };
  }
  return { run: true, reason: `event=${eventName}` };
}
