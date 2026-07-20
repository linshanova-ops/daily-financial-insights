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
    assert.equal(
      beijingDateString(new Date("2026-07-18T23:50:00.000Z")),
      "2026-07-19",
    );
  });
});

describe("activeSlot (on/after hour only)", () => {
  it("does NOT open before the Beijing hour (data must be as-of 08:00/20:00)", () => {
    assert.equal(activeSlot(new Date("2026-07-18T23:45:00.000Z")), null);
    assert.equal(activeSlot(new Date("2026-07-19T11:45:00.000Z")), null);
  });

  it("opens morning at 00:00 UTC (08:00 Beijing)", () => {
    const slot = activeSlot(new Date("2026-07-19T00:00:00.000Z"));
    assert.equal(slot?.id, "morning");
    assert.equal(slot?.date, "2026-07-19");
    assert.equal(Math.round(slot.minutesFromStart), 0);
  });

  it("allows morning up to +45m (catch-up after cron skips)", () => {
    const slot = activeSlot(new Date("2026-07-19T00:44:00.000Z"));
    assert.equal(slot?.id, "morning");
    assert.equal(Math.round(slot.minutesFromStart), 44);
  });

  it("closes morning at +45m", () => {
    assert.equal(activeSlot(new Date("2026-07-19T00:45:00.000Z")), null);
  });

  it("opens evening at 12:00 UTC (20:00 Beijing)", () => {
    const slot = activeSlot(new Date("2026-07-19T12:08:00.000Z"));
    assert.equal(slot?.id, "evening");
    assert.equal(slot?.date, "2026-07-19");
  });
});

describe("slotAlreadyPublished", () => {
  it("morning done after on-time publish", () => {
    const slot = activeSlot(new Date("2026-07-19T00:05:00.000Z"));
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-19", publishedAt: "2026-07-19T00:05:00.000Z" },
        slot,
      ),
      true,
    );
  });

  it("evening still open after morning publish", () => {
    const evening = activeSlot(new Date("2026-07-19T12:05:00.000Z"));
    assert.equal(
      slotAlreadyPublished(
        { date: "2026-07-19", publishedAt: "2026-07-19T00:10:00.000Z" },
        evening,
      ),
      false,
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

  it("repository_dispatch without force uses slot gate", () => {
    const r = evaluateScheduleGate({
      eventName: "repository_dispatch",
      forceDispatch: false,
      now: new Date("2026-07-19T03:00:00.000Z"),
      latest: null,
    });
    assert.equal(r.shouldRun, false);
  });

  it("repository_dispatch force=true always runs", () => {
    const r = evaluateScheduleGate({
      eventName: "repository_dispatch",
      forceDispatch: true,
      now: new Date("2026-07-19T03:00:00.000Z"),
    });
    assert.equal(r.shouldRun, true);
  });

  it("does not run before the hour", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-18T23:45:00.000Z"),
      latest: { date: "2026-07-18", publishedAt: "2026-07-18T12:00:00.000Z" },
    });
    assert.equal(r.shouldRun, false);
  });

  it("runs at/after the hour when unpublished", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T00:05:00.000Z"),
      latest: { date: "2026-07-18", publishedAt: "2026-07-18T12:00:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "morning");
  });

  it(`defaults early=${EARLY_MINUTES}m late=${LATE_MINUTES}m`, () => {
    assert.equal(EARLY_MINUTES, 0);
    assert.equal(LATE_MINUTES, 20);
  });
});

