import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarStatus,
  eventWindowForBriefingDate,
  sortCalendar,
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

describe("calendar status at publish time", () => {
  const PUB = "2026-08-06T01:30:00.000Z"; // 09:30 Beijing
  const rows = [
    { id: "later", date: "2026-08-07", timeBeijing: "20:30" },
    { id: "tbd", date: "2026-08-06", timeBeijing: "" },
    { id: "early", date: "2026-08-06", timeBeijing: "07:30" },
    { id: "holiday", date: "2026-08-06", timeBeijing: "", category: "holiday" },
    { id: "noon", date: "2026-08-06", timeBeijing: "12:00" },
    { id: "maybe", date: "2026-08-10", timing: "unconfirmed" },
  ];

  it("labels untimed rows by their timing", () => {
    const status = Object.fromEntries(rows.map((r) => [r.id, calendarStatus(r)]));
    assert.deepEqual(status, { later: null, tbd: "tbd", early: null, holiday: "all-day", noon: null, maybe: "unconfirmed" });
  });

  it("drops rows timed before publish and sorts the rest by time", () => {
    assert.deepEqual(sortCalendar(rows, PUB).map((r) => r.id), ["holiday", "noon", "tbd", "later", "maybe"]);
    assert.ok(sortCalendar(rows, null).some((r) => r.id === "early"));
  });
});
