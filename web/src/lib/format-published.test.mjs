import assert from "node:assert/strict";
import { describe, it } from "node:test";

const BRIEFING_PUBLISH_TIMEZONE = "Asia/Shanghai";

function formatPublishedAt(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRIEFING_PUBLISH_TIMEZONE,
    timeZoneName: "short",
  });
}

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
