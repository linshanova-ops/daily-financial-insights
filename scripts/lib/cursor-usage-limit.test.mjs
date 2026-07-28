import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  hasUsageLimitSkipMarker,
  isCursorUsageLimitError,
  markUsageLimitSkip,
} from "./cursor-usage-limit.mjs";

describe("isCursorUsageLimitError", () => {
  it("matches ConfigurationError usage_limit_exceeded messages", () => {
    assert.equal(
      isCursorUsageLimitError({
        name: "ConfigurationError",
        message:
          "[usage_limit_exceeded] Usage-based pricing required. Background Agent requires at least $2 remaining until your hard limit. Enable usage-based pricing and set a Spend Limit at https://www.cursor.com/dashboard?tab=settings.",
      }),
      true,
    );
  });

  it("rejects unrelated errors", () => {
    assert.equal(
      isCursorUsageLimitError(new Error("network timeout")),
      false,
    );
    assert.equal(isCursorUsageLimitError(null), false);
  });
});

describe("usage limit skip marker", () => {
  it("writes and detects SKIP file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-skip-"));
    assert.equal(hasUsageLimitSkipMarker(dir), false);
    markUsageLimitSkip(dir);
    assert.equal(hasUsageLimitSkipMarker(dir), true);
  });
});
