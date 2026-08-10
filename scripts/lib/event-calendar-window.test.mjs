import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eventWindowForBriefingDate,
  nextFridayOnOrAfter,
  nextWeekFridayAfter,
} from "./event-calendar-window.mjs";

describe("nextFridayOnOrAfter", () => {
  it("maps Thursday to this week's Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-06"), "2026-08-07");
  });

  it("keeps Friday as Friday", () => {
    assert.equal(nextFridayOnOrAfter("2026-08-07"), "2026-08-07");
  });
});

describe("nextWeekFridayAfter", () => {
  it("from Thursday ends next Friday not this Friday", () => {
    assert.equal(nextWeekFridayAfter("2026-08-06"), "2026-08-14");
  });

  it("from mid-week Monday spans this Friday + next (two weeks)", () => {
    assert.equal(nextWeekFridayAfter("2026-08-10"), "2026-08-21");
  });
});

describe("eventWindowForBriefingDate", () => {
  it("Aug 6 → window ends Aug 14", () => {
    assert.deepEqual(eventWindowForBriefingDate("2026-08-06"), {
      windowStart: "2026-08-06",
      windowEnd: "2026-08-14",
    });
  });
});
