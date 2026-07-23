import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRIEFING_JSON_SYNC_PATHS,
  checkBriefingJsonSync,
} from "./briefing-json-sync-check.mjs";

test("BRIEFING_JSON_SYNC_PATHS matches CI workflow scope", () => {
  assert.deepEqual(BRIEFING_JSON_SYNC_PATHS, [
    "web/public/data/briefings",
    "web/public/data/latest.json",
  ]);
});

test("checkBriefingJsonSync returns inSync on clean repo", () => {
  const repoRoot = new URL("../../..", import.meta.url).pathname;
  const { inSync, changedFiles } = checkBriefingJsonSync(repoRoot);
  assert.equal(typeof inSync, "boolean");
  assert.ok(Array.isArray(changedFiles));
  if (!inSync) {
    assert.ok(changedFiles.length > 0);
  }
});
