import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseBlsScheduleHtml } from "./event-calendar-fetch-bls.mjs";

const html = readFileSync(
  new URL("../fixtures/event-calendar/bls-schedule-2026-sample.html", import.meta.url),
  "utf8",
);

describe("parseBlsScheduleHtml", () => {
  it("extracts dated US data rows in window", () => {
    const events = parseBlsScheduleHtml(html, {
      windowStart: "2026-08-01",
      windowEnd: "2026-08-31",
    });
    assert.ok(events.length >= 1);
    for (const ev of events) {
      assert.equal(ev.region, "US");
      assert.equal(ev.category, "data");
      assert.match(ev.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(ev.source.href.includes("bls.gov"), true);
    }
  });
});
