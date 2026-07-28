/**
 * Detect Cursor Cloud Agent spend / usage-limit errors so CI can soft-skip
 * instead of painting every catch-up tick red.
 */
import fs from "node:fs";
import path from "node:path";

const USAGE_LIMIT_RE =
  /usage_limit_exceeded|Usage-based pricing required|at least \$2 remaining|Spend Limit/i;

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isCursorUsageLimitError(err) {
  if (!err) return false;
  const parts = [
    err?.message,
    err?.code,
    err?.name,
    err?.error,
    typeof err === "string" ? err : null,
  ];
  return parts.some((p) => p && USAGE_LIMIT_RE.test(String(p)));
}

/**
 * @param {string} dir
 * @param {string} [reason]
 */
export function markUsageLimitSkip(dir, reason = "usage_limit_exceeded") {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKIP"),
    `${reason}\n${new Date().toISOString()}\n`,
    "utf8",
  );
}

/**
 * @param {string} dir
 * @returns {boolean}
 */
export function hasUsageLimitSkipMarker(dir) {
  return fs.existsSync(path.join(dir, "SKIP"));
}
