import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fetchGovFixtures } from "./event-calendar-fetch-gov.mjs";
import {
  parseFedCalendarJson,
  easternTimeToBeijing,
} from "./event-calendar-fetch-fed.mjs";

const blsHtml = readFileSync(
  new URL("../fixtures/event-calendar/bls-schedule-2026-sample.html", import.meta.url),
  "utf8",
);

function mockFetch(url) {
  const href = String(url);
  if (href.includes("bls.gov/schedule")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      text: async () => blsHtml,
    });
  }
  return Promise.resolve({
    ok: false,
    status: 403,
    text: async () => "",
  });
}

describe("fetchGovFixtures", () => {
  it("returns BLS events and soft-fails other adapters on 403", async () => {
    const { events, errors } = await fetchGovFixtures({
      windowStart: "2026-08-01",
      windowEnd: "2026-08-31",
      fetchImpl: mockFetch,
    });

    assert.ok(events.length >= 1, "expected BLS events from sample HTML");
    assert.ok(
      events.some((ev) => ev.source?.href?.includes("bls.gov")),
      "expected at least one BLS-sourced event",
    );
    for (const ev of events) {
      assert.match(ev.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(ev.region);
      assert.ok(ev.category);
      assert.ok(ev.event);
    }

    // Soft-fail adapters that throw on hard HTTP failure appear in errors.
    assert.ok(Array.isArray(errors));
    assert.ok(
      errors.some((e) => e.name === "fed"),
      "fed should soft-fail when calendar endpoints return 403",
    );
    assert.ok(
      errors.every((e) => typeof e.name === "string" && typeof e.message === "string"),
    );
  });
});

describe("parseFedCalendarJson", () => {
  it("maps FOMC rows in window to US central-bank events", () => {
    const sample = JSON.stringify({
      events: [
        {
          title: "FOMC Meeting",
          time: "2:00 p.m.",
          month: "2026-08",
          days: "19",
          type: "FOMC",
        },
        {
          title: "H.15 - Selected Interest Rates",
          time: "4:15 p.m.",
          month: "2026-08",
          days: "19",
          type: "Stat",
        },
        {
          title: "Speech - Governor Example",
          time: "12:45 p.m.",
          month: "2026-08",
          days: "8",
          type: "Speeches",
        },
      ],
    });
    const events = parseFedCalendarJson(sample, {
      windowStart: "2026-08-01",
      windowEnd: "2026-08-31",
    });
    assert.equal(events.length, 2);
    assert.ok(events.every((ev) => ev.region === "US"));
    assert.ok(events.every((ev) => ev.category === "central-bank"));
    assert.ok(events.every((ev) => ev.source.href.includes("federalreserve.gov")));
    // Project mapping: ET +12h same calendar day (2:00 p.m. ET → 02:00 Beijing).
    assert.equal(easternTimeToBeijing("2:00 p.m."), "02:00");
    assert.equal(easternTimeToBeijing("8:30 AM"), "20:30");
  });
});
