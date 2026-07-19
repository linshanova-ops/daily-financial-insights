import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SLOT_WINDOW_MINUTES,
  activeSlot,
  evaluateScheduleGate,
  slotAlreadyPublished,
  slotStartUtc,
} from "./briefing-slot-gate.mjs";

describe("activeSlot", () => {
  it("opens morning window at 00:00–00:24 UTC (08:00 Beijing)", () => {
    const at = new Date("2026-07-19T00:08:00.000Z");
    const slot = activeSlot(at);
    assert.equal(slot?.id, "morning");
    assert.equal(slot?.minutesAfterStart, 8);
    assert.equal(slot?.date, "2026-07-19");
  });

  it("opens evening window at 12:00–12:24 UTC (20:00 Beijing)", () => {
    const at = new Date("2026-07-19T12:10:00.000Z");
    const slot = activeSlot(at);
    assert.equal(slot?.id, "evening");
    assert.equal(slot?.minutesAfterStart, 10);
  });

  it("is closed outside the windows", () => {
    assert.equal(activeSlot(new Date("2026-07-19T00:25:00.000Z")), null);
    assert.equal(activeSlot(new Date("2026-07-19T08:00:00.000Z")), null);
    assert.equal(activeSlot(new Date("2026-07-19T11:59:00.000Z")), null);
  });
});

describe("slotAlreadyPublished", () => {
  const morning = activeSlot(new Date("2026-07-19T00:05:00.000Z"));
  const evening = activeSlot(new Date("2026-07-19T12:05:00.000Z"));

  it("morning not done before slot publish", () => {
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-18", publishedAt: "2026-07-18T12:10:00.000Z" },
        morning,
        new Date("2026-07-19T00:05:00.000Z"),
      ),
      false,
    );
  });

  it("morning done once publishedAt >= 00:00Z same date", () => {
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-19", publishedAt: "2026-07-19T00:12:00.000Z" },
        morning,
        new Date("2026-07-19T00:15:00.000Z"),
      ),
      true,
    );
  });

  it("evening still open after morning publish", () => {
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-19", publishedAt: "2026-07-19T00:12:00.000Z" },
        evening,
        new Date("2026-07-19T12:05:00.000Z"),
      ),
      false,
    );
  });

  it("evening done after 12:00Z publish", () => {
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-19", publishedAt: "2026-07-19T12:08:00.000Z" },
        evening,
        new Date("2026-07-19T12:15:00.000Z"),
      ),
      true,
    );
  });

  it("slotStartUtc matches hour", () => {
    const start = slotStartUtc(morning, new Date("2026-07-19T00:05:00.000Z"));
    assert.equal(start.toISOString(), "2026-07-19T00:00:00.000Z");
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

  it("skips schedule outside window", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T03:00:00.000Z"),
      latest: null,
    });
    assert.equal(r.shouldRun, false);
  });

  it("runs schedule inside morning window when unpublished", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T00:09:00.000Z"),
      latest: { date: "2026-07-18", publishedAt: "2026-07-18T12:00:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "morning");
  });

  it("skips schedule when morning already published", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T00:09:00.000Z"),
      latest: { date: "2026-07-19", publishedAt: "2026-07-19T00:05:00.000Z" },
    });
    assert.equal(r.shouldRun, false);
  });

  it(`uses ${SLOT_WINDOW_MINUTES}m window by default`, () => {
    assert.equal(SLOT_WINDOW_MINUTES, 25);
  });
});
