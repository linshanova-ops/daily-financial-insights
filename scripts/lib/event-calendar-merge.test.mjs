// scripts/lib/event-calendar-merge.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inWindow,
  eventDedupeKey,
  mergeCalendarEvents,
  stripBannedUkEuData,
  stripTaiwanHkCalendarEvents,
} from "./event-calendar-merge.mjs";

describe("inWindow", () => {
  it("includes endpoints", () => {
    assert.equal(inWindow("2026-08-07", "2026-08-07", "2026-08-14"), true);
    assert.equal(inWindow("2026-08-14", "2026-08-07", "2026-08-14"), true);
    assert.equal(inWindow("2026-08-15", "2026-08-07", "2026-08-14"), false);
  });
});

describe("mergeCalendarEvents", () => {
  it("prefers IMAP over fixture on same dedupe key", () => {
    const imap = [{
      id: "imap-cpi",
      date: "2026-08-12",
      region: "US",
      category: "data",
      event: "US CPI (July)",
      consensus: "0.2%",
      source: { label: "Bloomberg", href: "https://www.bloomberg.com/asia" },
    }];
    const fixtures = [{
      id: "bls-cpi",
      date: "2026-08-12",
      region: "US",
      category: "data",
      event: "US CPI (July)",
      source: { label: "BLS", href: "https://www.bls.gov/schedule/2026/" },
    }];
    const merged = mergeCalendarEvents({
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
      imapEvents: imap,
      govEvents: fixtures,
      earningsEvents: [],
    });
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "imap-cpi");
    assert.equal(merged[0].consensus, "0.2%");
  });

  it("drops UK/EU category=data", () => {
    const out = stripBannedUkEuData([
      { id: "1", date: "2026-08-10", region: "EU", category: "data", event: "EZ retail", source: { label: "x", href: "https://example.com" } },
      { id: "2", date: "2026-08-10", region: "EU", category: "central-bank", event: "ECB", source: { label: "x", href: "https://example.com" } },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, "2");
  });

  it("drops Taiwan/HK calendar rows; keeps mainland China", () => {
    const out = stripTaiwanHkCalendarEvents([
      {
        id: "tw-cpi",
        date: "2026-08-07",
        region: "China",
        category: "data",
        event: "Taiwan July CPI y/y",
      },
      {
        id: "hk-fx-reserves-jul",
        date: "2026-08-07",
        region: "China",
        category: "data",
        event: "Hong Kong July FX reserves",
      },
      {
        id: "cn-fx-reserves-jul",
        date: "2026-08-07",
        region: "China",
        category: "data",
        event: "China July FX reserves",
      },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, "cn-fx-reserves-jul");
  });
});
