import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  parseEarningsFromIrHtml,
  fetchEarningsFixtures,
} from "./event-calendar-fetch-earnings.mjs";

const msftHtml = readFileSync(
  new URL("../fixtures/event-calendar/msft-ir-sample.html", import.meta.url),
  "utf8",
);

const msft = {
  id: "msft",
  name: "Microsoft",
  ticker: "MSFT",
  region: "US",
  irUrl: "https://www.microsoft.com/en-us/investor/earnings/",
  status: "public",
};

const openai = {
  id: "openai",
  name: "OpenAI",
  ticker: null,
  region: "US",
  irUrl: null,
  status: "pre-ipo",
};

describe("parseEarningsFromIrHtml", () => {
  it("returns [] for pre-ipo companies", () => {
    const events = parseEarningsFromIrHtml(msftHtml, openai, {
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
    });
    assert.deepEqual(events, []);
  });

  it("extracts earnings date in window from IR HTML", () => {
    const events = parseEarningsFromIrHtml(msftHtml, msft, {
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
    });
    assert.equal(events.length, 1);
    const ev = events[0];
    assert.equal(ev.date, "2026-08-13");
    assert.equal(ev.category, "earnings");
    assert.equal(ev.event, "Microsoft earnings");
    assert.equal(ev.region, "US");
    assert.equal(ev.source.href, msft.irUrl);
    assert.ok(ev.id);
  });

  it("picks earliest labeled earnings date in window when several match", () => {
    const html = `
      <p>Will announce earnings on August 15, 2026</p>
      <p>Earnings on August 10, 2026</p>
      <p>Earnings date 2026-08-12</p>
    `;
    const events = parseEarningsFromIrHtml(html, msft, {
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].date, "2026-08-10");
  });

  it("returns [] for unlabeled page dates (e.g. Updated August 11)", () => {
    const html = `
      <p>Last Updated August 11, 2026</p>
      <p>Investor Relations homepage</p>
      <p>Press release dated 2026-08-10</p>
    `;
    const events = parseEarningsFromIrHtml(html, msft, {
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
    });
    assert.deepEqual(events, []);
  });

  it("returns [] when no date falls in window", () => {
    const html = `<p>Microsoft earnings on July 29, 2026</p>`;
    const events = parseEarningsFromIrHtml(html, msft, {
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
    });
    assert.deepEqual(events, []);
  });
});

describe("fetchEarningsFixtures", () => {
  it("fetches IR HTML for watchlist public companies with irUrl", async () => {
    const watchlist = {
      companies: [
        msft,
        openai,
        {
          id: "googl",
          name: "Google",
          ticker: "GOOGL",
          region: "US",
          irUrl: "https://abc.xyz/investor/",
          status: "public",
        },
      ],
    };

    const fetched = [];
    const fetchImpl = (url) => {
      fetched.push(String(url));
      if (String(url) === msft.irUrl) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => msftHtml,
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => "",
      });
    };

    const { events, errors } = await fetchEarningsFixtures({
      watchlist,
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
      fetchImpl,
    });

    assert.ok(fetched.includes(msft.irUrl));
    assert.ok(!fetched.includes("null"));
    assert.equal(fetched.filter((u) => u === openai.irUrl).length, 0);

    assert.ok(events.some((ev) => ev.event === "Microsoft earnings"));
    assert.ok(events.every((ev) => ev.category === "earnings"));
    assert.ok(Array.isArray(errors));
    assert.ok(
      errors.some((e) => e.name === "googl" || e.name === "Google"),
      "soft-fail Google 404 should appear in errors",
    );
  });

  it("soft-fails a throwing company without aborting others", async () => {
    const watchlist = {
      companies: [
        msft,
        {
          id: "amzn",
          name: "Amazon",
          ticker: "AMZN",
          region: "US",
          irUrl: "https://ir.aboutamazon.com/",
          status: "public",
        },
      ],
    };

    const fetchImpl = (url) => {
      if (String(url).includes("aboutamazon")) {
        return Promise.reject(new Error("network down"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => msftHtml,
      });
    };

    const { events, errors } = await fetchEarningsFixtures({
      watchlist,
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
      fetchImpl,
    });

    assert.ok(events.some((ev) => ev.date === "2026-08-13"));
    assert.ok(errors.some((e) => /amazon|amzn/i.test(e.name)));
  });
});
