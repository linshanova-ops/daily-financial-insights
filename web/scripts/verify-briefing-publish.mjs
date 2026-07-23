#!/usr/bin/env node
/**
 * Local publish gate — mirrors .github/workflows/briefing-accuracy.yml.
 *
 * 1) sync-data from markdown
 * 2) fail if briefings/*.json or latest.json still differ from git (must be committed)
 * 3) scan-links (fetch + evidence check)
 *
 * Run from web/: npm run verify-briefing
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRIEFING_JSON_SYNC_PATHS,
  checkBriefingJsonSync,
} from "./lib/briefing-json-sync-check.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const repoRoot = path.join(webRoot, "..");

function runStep(label, command, args, cwd) {
  console.log(`[verify-briefing] ${label}…`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printJsonSyncFailure(changedFiles) {
  console.error(
    "\n[verify-briefing] FAIL — briefing JSON is out of sync with markdown.",
  );
  console.error(
    "Run completed sync-data but these files still differ from git HEAD:",
  );
  for (const file of changedFiles) {
    console.error(`  - ${file}`);
  }
  console.error(
    "\nFix: stage and commit them in the SAME commit as web/content/briefings/*.md:",
  );
  console.error(
    "  git add web/public/data/briefings web/public/data/latest.json",
  );
  console.error(
    "Never push markdown-only commits — CI will fail the same way.\n",
  );
}

function main() {
  runStep("sync-data", "npm", ["run", "sync-data"], webRoot);

  const { inSync, changedFiles } = checkBriefingJsonSync(repoRoot);
  if (!inSync) {
    printJsonSyncFailure(changedFiles);
    process.exit(1);
  }

  console.log(
    `[verify-briefing] JSON sync OK (${BRIEFING_JSON_SYNC_PATHS.join(", ")})`,
  );

  runStep("scan-links", "npm", ["run", "scan-links"], webRoot);

  console.log(
    "[verify-briefing] OK — ready to commit/push (markdown + JSON + scan-links).",
  );
}

main();
