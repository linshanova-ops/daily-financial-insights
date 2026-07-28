import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  loadBriefingOps,
  shouldRunCursorGenerate,
} from "./briefing-ops.mjs";

describe("loadBriefingOps", () => {
  it("honors manual mode before resume date", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "briefing-ops-"));
    const p = path.join(dir, "ops.json");
    fs.writeFileSync(
      p,
      JSON.stringify({
        cursorAutoGenerate: false,
        cursorAutoResumeOn: "2026-08-15",
      }),
    );
    const ops = loadBriefingOps(p, new Date("2026-07-28T04:00:00.000Z"));
    assert.equal(ops.cursorAutoGenerate, false);
    assert.match(ops.reason, /manual mode until 2026-08-15/);
  });

  it("auto-resumes on/after resume date", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "briefing-ops-"));
    const p = path.join(dir, "ops.json");
    fs.writeFileSync(
      p,
      JSON.stringify({
        cursorAutoGenerate: false,
        cursorAutoResumeOn: "2026-08-15",
      }),
    );
    const ops = loadBriefingOps(p, new Date("2026-08-15T04:00:00.000Z"));
    assert.equal(ops.cursorAutoGenerate, true);
  });
});

describe("shouldRunCursorGenerate", () => {
  it("blocks schedule ticks in manual mode", () => {
    const r = shouldRunCursorGenerate({
      ops: { cursorAutoGenerate: false, reason: "manual" },
      eventName: "repository_dispatch",
    });
    assert.equal(r.run, false);
  });

  it("allows explicit force_cursor override", () => {
    const r = shouldRunCursorGenerate({
      ops: { cursorAutoGenerate: false, reason: "manual" },
      eventName: "repository_dispatch",
      forceCursor: true,
    });
    assert.equal(r.run, true);
  });
});
