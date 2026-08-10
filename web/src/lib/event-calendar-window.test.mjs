import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventWindowForBriefingDate,
  nextFridayOnOrAfter,
  nextWeekFridayAfter,
} from "./event-calendar-window.ts";

describe("nextFridayOnOrAfter", () => {
  it("maps Thursday to this week's Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-06"), "2026-08-07");
  });

  it("keeps Friday as Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-07"), "2026-08-07");
  });

  it("maps Saturday to the coming Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-08"), "2026-08-14");
  });
});

describe("nextWeekFridayAfter", () => {
  it("from Thursday ends next Friday not this Friday", () => {
    assert.equal(nextWeekFridayAfter("2026-08-06"), "2026-08-14");
  });

  it("from Friday ends the following Friday", () => {
    assert.equal(nextWeekFridayAfter("2026-08-07"), "2026-08-14");
  });

  it("from Monday ends next Friday (week-ahead)", () => {
    assert.equal(nextWeekFridayAfter("2026-08-03"), "2026-08-14");
  });

  it("from mid-week Monday spans this Friday + next (two weeks)", () => {
    assert.equal(nextWeekFridayAfter("2026-08-10"), "2026-08-21");
  });
});

describe("eventWindowForBriefingDate", () => {
  it("uses next Friday as windowEnd", () => {
    assert.deepEqual(eventWindowForBriefingDate("2026-08-06"), {
      windowStart: "2026-08-06",
      windowEnd: "2026-08-14",
    });
  });
});
