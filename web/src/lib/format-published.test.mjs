import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  daysSincePublished,
  formatPublishedAt,
  freshnessStatusLine,
} from "./format-published.ts";

describe("formatPublishedAt", () => {
  it("uses Beijing time so morning editions match the briefing date", () => {
    const label = formatPublishedAt("2026-07-27T00:09:22.836Z");
    assert.ok(label);
    assert.match(label, /Jul 27, 2026/);
    assert.match(label, /08:09/);
    assert.doesNotMatch(label, /Jul 26/);
  });

  it("returns null for missing or invalid input", () => {
    assert.equal(formatPublishedAt(null), null);
    assert.equal(formatPublishedAt(undefined), null);
    assert.equal(formatPublishedAt("not-a-date"), null);
  });
});

describe("freshnessStatusLine", () => {
  it("reports days since publish for stale editions", () => {
    const published = "2026-08-03T05:17:30.000Z";
    const now = Date.parse("2026-08-06T07:00:00.000Z");
    assert.equal(daysSincePublished(published, now), 3);
    assert.match(freshnessStatusLine(published, now), /3 days ago/);
  });

  it("says today when published within 24h", () => {
    const published = "2026-08-06T01:00:00.000Z";
    const now = Date.parse("2026-08-06T07:00:00.000Z");
    assert.equal(daysSincePublished(published, now), 0);
    assert.match(freshnessStatusLine(published, now), /today/i);
  });
});
