import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  restoreWorkspaceFiles,
  snapshotWorkspaceFiles,
} from "./commit-inbox-for-briefing.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("snapshotWorkspaceFiles / restoreWorkspaceFiles", () => {
  it("round-trips inbox capture bytes used across branch checkout", () => {
    const tmpRel = path.join(
      "web/content/inbox",
      `.test-last-fetch-${process.pid}.json`,
    );
    const abs = path.join(root, tmpRel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const payload = JSON.stringify({
      ok: true,
      at: "2026-07-22T12:50:00.000Z",
      marker: `pid-${process.pid}`,
    });
    fs.writeFileSync(abs, payload);

    try {
      const snap = snapshotWorkspaceFiles([tmpRel]);
      assert.equal(snap.size, 1);
      assert.equal(snap.get(tmpRel)?.toString("utf8"), payload);

      // Simulate checkout wiping / replacing the file
      fs.writeFileSync(abs, '{"ok":false,"wiped":true}\n');
      restoreWorkspaceFiles(snap);
      assert.equal(fs.readFileSync(abs, "utf8"), payload);
    } finally {
      fs.rmSync(abs, { force: true });
    }
  });

  it("skips missing paths without throwing", () => {
    const snap = snapshotWorkspaceFiles([
      `web/content/inbox/.missing-${process.pid}.json`,
    ]);
    assert.equal(snap.size, 0);
    restoreWorkspaceFiles(snap);
  });
});
