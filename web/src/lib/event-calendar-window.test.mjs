import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventWindowForBriefingDate,
  nextFridayOnOrAfter,
} from "./event-calendar-window.ts";

describe("nextFridayOnOrAfter", () => {
  it("maps Thursday to the same week's Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-06"), "2026-08-07");
  });

  it("keeps Friday as Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-07"), "2026-08-07");
  });

  it("maps Saturday to the next Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-08"), "2026-08-14");
  });

  it("maps Sunday to the next Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-09"), "2026-08-14");
  });

  it("maps Monday to that week's Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-03"), "2026-08-07");
  });
});

describe("eventWindowForBriefingDate", () => {
  it("returns inclusive start/end", () => {
    assert.deepEqual(eventWindowForBriefingDate("2026-08-06"), {
      windowStart: "2026-08-06",
      windowEnd: "2026-08-07",
    });
  });
});
