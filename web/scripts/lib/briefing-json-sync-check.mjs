/**
 * Same paths CI checks after sync-data (index.json generatedAt is ignored).
 */
import { spawnSync } from "node:child_process";

export const BRIEFING_JSON_SYNC_PATHS = [
  "web/public/data/briefings",
  "web/public/data/latest.json",
];

/**
 * @param {string} repoRoot
 * @returns {{ inSync: boolean, changedFiles: string[] }}
 */
export function checkBriefingJsonSync(repoRoot) {
  const diff = spawnSync(
    "git",
    ["diff", "--name-only", "--", ...BRIEFING_JSON_SYNC_PATHS],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const changedFiles = (diff.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { inSync: changedFiles.length === 0, changedFiles };
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function isBriefingJsonInSync(repoRoot) {
  return checkBriefingJsonSync(repoRoot).inSync;
}
