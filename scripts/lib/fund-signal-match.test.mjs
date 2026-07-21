import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confidenceTier,
  fundAliases,
  parseRssItems,
  scoreFundMention,
  signalDedupKey,
  withinHours,
} from "./fund-signal-match.mjs";

describe("fundAliases", () => {
  it("adds short brand forms", () => {
    const a = fundAliases("Citadel Investment Group");
    assert.ok(a.includes("Citadel Investment Group"));
    assert.ok(a.includes("Citadel"));
  });
});

describe("scoreFundMention", () => {
  it("scores official name highly", () => {
    const { score, matchedAs } = scoreFundMention(
      "Citadel Investment Group expands credit book",
      { name: "Citadel Investment Group" },
    );
    assert.equal(matchedAs, "Citadel Investment Group");
    assert.ok(score >= 75);
    assert.equal(confidenceTier(score), "confirmed");
  });

  it("scores short alias in mid-high band", () => {
    const { score } = scoreFundMention("Point72 hires Asia PM", {
      name: "Point72 Asset Management",
    });
    assert.ok(score >= 75);
  });

  it("marks industry-only copy as weak", () => {
    const { score } = scoreFundMention("Hedge funds rally in June", {
      name: "Citadel Investment Group",
    });
    assert.equal(confidenceTier(score), "exclude");
  });
});

describe("parseRssItems", () => {
  it("parses basic RSS items", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Millennium raises capital</title><link>https://example.com/a</link>
      <pubDate>Mon, 20 Jul 2026 12:00:00 GMT</pubDate>
      <description>Millennium Capital Partners plans raise</description></item>
    </channel></rss>`;
    const items = parseRssItems(xml, "Test");
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Millennium/);
    assert.equal(items[0].source, "Test");
  });
});

describe("withinHours / dedupe", () => {
  it("accepts recent dates", () => {
    const recent = new Date(Date.now() - 2 * 3600 * 1000).toUTCString();
    assert.equal(withinHours(recent, 72), true);
  });

  it("builds stable dedupe keys", () => {
    assert.equal(
      signalDedupKey("Hello World", "Citadel"),
      signalDedupKey("hello   world", "citadel"),
    );
  });
});
