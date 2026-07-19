import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EARLY_MINUTES,
  LATE_MINUTES,
  activeSlot,
  beijingDateString,
  evaluateScheduleGate,
  slotAlreadyPublished,
  slotStartUtc,
} from "./briefing-slot-gate.mjs";

describe("beijingDateString", () => {
  it("uses Asia/Shanghai calendar date", () => {
    // 2026-07-18 23:50 UTC = 2026-07-19 07:50 Beijing
    assert.equal(
      beijingDateString(new Date("2026-07-18T23:50:00.000Z")),
      "2026-07-19",
    );
  });
});

describe("activeSlot (early + late window)", () => {
  it("opens morning early before UTC midnight (still Beijing 08:00 date)", () => {
    const at = new Date("2026-07-18T23:45:00.000Z"); // 07:45 Beijing Jul 19
    const slot = activeSlot(at);
    assert.equal(slot?.id, "morning");
    assert.equal(slot?.date, "2026-07-19");
    assert.ok(slot.minutesFromStart < 0);
    assert.ok(slot.minutesFromStart > -EARLY_MINUTES - 0.01);
  });

  it("opens morning at/after 00:00 UTC", () => {
    const at = new Date("2026-07-19T00:08:00.000Z");
    const slot = activeSlot(at);
    assert.equal(slot?.id, "morning");
    assert.equal(slot?.date, "2026-07-19");
    assert.equal(Math.round(slot.minutesFromStart), 8);
  });

  it("opens evening early (11:45 UTC = 19:45 Beijing)", () => {
    const at = new Date("2026-07-19T11:45:00.000Z");
    const slot = activeSlot(at);
    assert.equal(slot?.id, "evening");
    assert.equal(slot?.date, "2026-07-19");
    assert.ok(slot.minutesFromStart < 0);
  });

  it("opens evening late window until +25m", () => {
    const at = new Date("2026-07-19T12:10:00.000Z");
    const slot = activeSlot(at);
    assert.equal(slot?.id, "evening");
    assert.equal(Math.round(slot.minutesFromStart), 10);
  });

  it("is closed outside early/late windows", () => {
    assert.equal(activeSlot(new Date("2026-07-19T00:30:00.000Z")), null);
    assert.equal(activeSlot(new Date("2026-07-19T08:00:00.000Z")), null);
    assert.equal(activeSlot(new Date("2026-07-18T23:30:00.000Z")), null);
  });
});

describe("slotAlreadyPublished", () => {
  it("treats early publish as morning done", () => {
    const slot = activeSlot(new Date("2026-07-18T23:50:00.000Z"));
    assert.equal(
      slotAlreadyPublished(
        {
          date: "2026-07-19",
          publishedAt: "2026-07-18T23:50:00.000Z",
        },
        slot,
      ),
      true,
    );
  });

  it("evening still open after morning early publish", () => {
    const evening = activeSlot(new Date("2026-07-19T11:50:00.000Z"));
    assert.equal(
      slotAlreadyPublished(
        {
          date: "2026-07-19",
          publishedAt: "2026-07-18T23:50:00.000Z",
        },
        evening,
      ),
      false,
    );
  });

  it("evening done after evening publish", () => {
    const evening = activeSlot(new Date("2026-07-19T12:05:00.000Z"));
    assert.equal(
      slotAlreadyPublished(
        {
          date: "2026-07-19",
          publishedAt: "2026-07-19T11:55:00.000Z",
        },
        evening,
      ),
      true,
    );
  });

  it("slotStartUtc for morning/evening", () => {
    assert.equal(
      slotStartUtc("morning", "2026-07-19").toISOString(),
      "2026-07-19T00:00:00.000Z",
    );
    assert.equal(
      slotStartUtc("evening", "2026-07-19").toISOString(),
      "2026-07-19T12:00:00.000Z",
    );
  });
});

describe("evaluateScheduleGate", () => {
  it("always runs for workflow_dispatch", () => {
    const r = evaluateScheduleGate({
      eventName: "workflow_dispatch",
      now: new Date("2026-07-19T03:00:00.000Z"),
    });
    assert.equal(r.shouldRun, true);
  });

  it("runs schedule in early morning window", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-18T23:45:00.000Z"),
      latest: { date: "2026-07-18", publishedAt: "2026-07-18T12:00:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "morning");
    assert.equal(r.slot?.date, "2026-07-19");
  });

  it("skips when early morning already published", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T00:05:00.000Z"),
      latest: {
        date: "2026-07-19",
        publishedAt: "2026-07-18T23:50:00.000Z",
      },
    });
    assert.equal(r.shouldRun, false);
  });

  it(`defaults early=${EARLY_MINUTES}m late=${LATE_MINUTES}m`, () => {
    assert.equal(EARLY_MINUTES, 20);
    assert.equal(LATE_MINUTES, 25);
  });
});
