import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EARLY_MINUTES,
  LATE_MINUTES,
  MISSED_CATCHUP_HOURS,
  activeSlot,
  beijingDateString,
  evaluateScheduleGate,
  isBeijingPostWeekendOpen,
  isBeijingWeekendDate,
  missedUnpublishedSlot,
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
      now: new Date("2026-07-19T08:00:00.000Z"), // outside morning catch-up (ends 06:00)
      latest: { date: "2026-07-19", publishedAt: "2026-07-19T00:10:00.000Z" },
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
    // Use a weekday (Wed) — Sat/Sun scheduled slots are skipped.
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-15T00:05:00.000Z"),
      latest: { date: "2026-07-14", publishedAt: "2026-07-14T12:00:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "morning");
    assert.equal(r.slot?.date, "2026-07-15");
  });

  it(`defaults early=${EARLY_MINUTES}m late=${LATE_MINUTES}m catchup=${MISSED_CATCHUP_HOURS}h`, () => {
    assert.equal(EARLY_MINUTES, 0);
    assert.equal(LATE_MINUTES, 45);
    assert.equal(MISSED_CATCHUP_HOURS, 6);
  });

  it("missed-slot catch-up runs evening after primary window if unpublished", () => {
    // 13:05 UTC = ~65m after 20:00 Beijing; primary closed at +45m
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-20T13:05:00.000Z"),
      latest: {
        date: "2026-07-20",
        publishedAt: "2026-07-20T06:47:24.000Z", // morning only
      },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "evening");
    assert.match(r.reason, /missed-slot catch-up/);
  });

  it("missed-slot catch-up skips when evening already published", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-20T13:05:00.000Z"),
      latest: {
        date: "2026-07-20",
        publishedAt: "2026-07-20T12:10:00.000Z",
      },
    });
    assert.equal(r.shouldRun, false);
  });
});

describe("missedUnpublishedSlot", () => {
  it("returns evening after primary window when only morning published", () => {
    const slot = missedUnpublishedSlot(
      new Date("2026-07-20T13:00:00.000Z"),
      { date: "2026-07-20", publishedAt: "2026-07-20T00:10:00.000Z" },
    );
    assert.equal(slot?.id, "evening");
    assert.equal(slot?.date, "2026-07-20");
  });
});

describe("Beijing weekend skip (Sat/Sun scheduled generates)", () => {
  it("detects Beijing Saturday/Sunday calendar dates", () => {
    assert.equal(isBeijingWeekendDate("2026-07-18"), true); // Sat
    assert.equal(isBeijingWeekendDate("2026-07-19"), true); // Sun
    assert.equal(isBeijingWeekendDate("2026-07-20"), false); // Mon
    assert.equal(isBeijingWeekendDate("2026-07-17"), false); // Fri
  });

  it("skips scheduled Saturday morning slot (saves Cursor tokens)", () => {
    // Beijing Sat 08:00 = Fri 00:00 UTC? No: Sat 08:00 Beijing = Fri 24:00 = Sat 00:00 UTC
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-18T00:05:00.000Z"), // Sat 08:05 Beijing
      latest: { date: "2026-07-17", publishedAt: "2026-07-17T12:10:00.000Z" },
    });
    assert.equal(r.shouldRun, false);
    assert.match(r.reason, /weekend/i);
    assert.equal(r.slot?.date, "2026-07-18");
  });

  it("skips scheduled Sunday evening slot", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-19T12:05:00.000Z"), // Sun 20:05 Beijing
      latest: { date: "2026-07-17", publishedAt: "2026-07-17T12:10:00.000Z" },
    });
    assert.equal(r.shouldRun, false);
    assert.match(r.reason, /weekend/i);
  });

  it("still allows Friday evening catch-up that spills into Saturday Beijing clock", () => {
    // Friday evening start Fri 12:00 UTC; catch-up open until Fri 18:00 UTC (= Sat 02:00 Beijing)
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-17T13:05:00.000Z"), // Fri+65m; still Friday slot.date
      latest: { date: "2026-07-17", publishedAt: "2026-07-17T00:10:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "evening");
    assert.equal(r.slot?.date, "2026-07-17");
  });

  it("Monday morning still runs after weekend skip", () => {
    const r = evaluateScheduleGate({
      eventName: "schedule",
      now: new Date("2026-07-20T00:05:00.000Z"), // Mon 08:05 Beijing
      latest: { date: "2026-07-17", publishedAt: "2026-07-17T12:10:00.000Z" },
    });
    assert.equal(r.shouldRun, true);
    assert.equal(r.slot?.id, "morning");
    assert.equal(r.slot?.date, "2026-07-20");
  });

  it("force dispatch still runs on Saturday", () => {
    const r = evaluateScheduleGate({
      eventName: "repository_dispatch",
      forceDispatch: true,
      now: new Date("2026-07-18T00:05:00.000Z"),
    });
    assert.equal(r.shouldRun, true);
  });

  it("marks Monday as post-weekend open for coverage prompts", () => {
    assert.equal(isBeijingPostWeekendOpen("2026-07-20"), true);
    assert.equal(isBeijingPostWeekendOpen("2026-07-21"), false);
    assert.equal(isBeijingPostWeekendOpen("2026-07-18"), false);
  });
});

