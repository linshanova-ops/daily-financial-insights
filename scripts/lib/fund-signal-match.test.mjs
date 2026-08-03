import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  bilingualSummary,
  cleanHeadline,
  confidenceTier,
  fundAliases,
  googleNewsSearchAliases,
  parseRssItems,
  primarySearchAlias,
  scoreFundMention,
  dedupeStoryClusters,
  isSameFundStory,
  signalDedupKey,
  storyFingerprintTokens,
  withinHours,
} from "./fund-signal-match.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("fundAliases", () => {
  it("adds short brand forms", () => {
    const a = fundAliases("Citadel Investment Group");
    assert.ok(a.includes("Citadel Investment Group"));
    assert.ok(a.includes("Citadel"));
  });
});

describe("primarySearchAlias / googleNewsSearchAliases", () => {
  it("avoids ultra-short HAO token for Google News", () => {
    assert.equal(primarySearchAlias("HAO Capital"), "HAO Capital");
  });

  it("keeps known acronym brands like LMR", () => {
    assert.equal(primarySearchAlias("LMR Partners"), "LMR");
  });

  it("prefers Schroders brand over Schroder stem", () => {
    assert.equal(primarySearchAlias("Schroders"), "Schroders");
  });

  it("covers the twelve admin-added / late-ranked names", () => {
    const names = [
      "Oaktree Capital Management",
      "HAO Capital",
      "Sona Asset Management",
      "Elliott Investment Management",
      "LMR Partners",
      "Caxton Associates",
      "Linden Advisors",
      "Waha Investments",
      "PIMCO",
      "Barings",
      "Neuberger Berman",
      "Brookfield",
      "Schroders",
    ];
    const { aliases, uncovered } = googleNewsSearchAliases(
      names.map((name) => ({ name })),
    );
    assert.equal(uncovered.length, 0);
    assert.equal(aliases.length, names.length);
  });

  it("covers every monitored fund in the live content set", () => {
    const monitoredFile = JSON.parse(
      fs.readFileSync(path.join(root, "web/content/fund/monitored.json"), "utf8"),
    );
    const universe = JSON.parse(
      fs.readFileSync(path.join(root, "web/content/fund/universe.json"), "utf8"),
    );
    const byRank = new Map(universe.map((f) => [f.rank, f]));
    const monitored = monitoredFile.funds
      .map((ref) => byRank.get(ref.rank) || { rank: ref.rank, name: ref.name })
      .filter((f) => f?.name);

    assert.ok(monitored.length >= 100, `expected ≥100 monitored, got ${monitored.length}`);
    const { aliases, uncovered, monitoredCount } = googleNewsSearchAliases(monitored);
    assert.equal(uncovered.length, 0, `uncovered: ${uncovered.join(", ")}`);
    assert.equal(monitoredCount, monitored.length);
    // Shared brands (Two Sigma / Polar) may collapse a few aliases
    assert.ok(
      aliases.length >= monitored.length - 5,
      `alias coverage too low: ${aliases.length}/${monitored.length}`,
    );
    // Regression: never silently shrink back to the old 40-alias cap
    assert.ok(aliases.length > 40, `still capped? aliases=${aliases.length}`);
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

  it("does not match III Capital on SPAC 'III' tokens", () => {
    const { score, matchedAs } = scoreFundMention(
      "Dynamix III Ord Shs Class A Shareholder Structure",
      { name: "III Capital" },
    );
    assert.equal(matchedAs, null);
    assert.equal(score, 0);
  });

  it("still matches Millennium on Meridiem exit headline", () => {
    const { score, matchedAs } = scoreFundMention(
      "Meridiem Capital rebuilds with Schonfeld backing after Millennium Exit",
      { name: "Millennium Capital Partners" },
    );
    assert.equal(matchedAs, "Millennium");
    assert.ok(score >= 75);
  });
});

describe("parseRssItems", () => {
  it("parses basic RSS items and source publisher", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Millennium raises capital</title><link>https://example.com/a</link>
      <pubDate>Mon, 20 Jul 2026 12:00:00 GMT</pubDate>
      <description>Millennium Capital Partners plans raise</description>
      <source url="https://example.com/">Example Pub</source></item>
    </channel></rss>`;
    const items = parseRssItems(xml, "Test");
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Millennium/);
    assert.equal(items[0].source, "Example Pub");
    assert.equal(items[0].publisherUrl, "https://example.com/");
  });
});

describe("cleanHeadline / bilingualSummary", () => {
  it("strips publisher suffix from Google News titles", () => {
    assert.equal(
      cleanHeadline("Citadel posts gains - CNBC"),
      "Citadel posts gains",
    );
  });

  it("seeds bilingual summaries by topic", () => {
    const hire = bilingualSummary(
      "Point72 hires Asia PM - Bloomberg",
      "Point72 Asset Management",
      "人员 / 招聘",
    );
    assert.match(hire.summaryEn, /hiring|personnel/i);
    assert.match(hire.summary, /人事|招聘/);
    assert.ok(!hire.summaryEn.includes("Bloomberg"));

    const raise = bilingualSummary(
      "Millennium targets $10bn capital raise",
      "Millennium Capital Partners",
      "募资",
    );
    assert.match(raise.summaryEn, /capital|fundraising/i);
    assert.match(raise.summary, /募资|扩容/);
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

  it("clusters Situational Awareness wire variants for Citadel", () => {
    const fund = "Citadel Investment Group";
    assert.equal(
      isSameFundStory(
        "Citadel buys most of Situational's stock holdings after AI share rout, sources say",
        "Exclusive | Citadel Buys Situational Awareness’s Stock Portfolio After Big Losses in AI",
        fund,
      ),
      true,
    );
    assert.equal(
      isSameFundStory(
        "Citadel buys most of Situational's stock holdings after AI share rout, sources say",
        "Point72 expands quantitative hiring in London credit",
        fund,
      ),
      false,
    );
    assert.ok(
      storyFingerprintTokens(
        "Citadel Buys Situational Awareness’s Stock Portfolio",
        fund,
      ).includes("situational"),
    );
  });

  it("keeps Bloomberg/WSJ as canonical and attaches relatedSources", () => {
    const out = dedupeStoryClusters([
      {
        id: "1",
        date: "2026.08.02",
        title: "Citadel rescues Situational Awareness after AI losses",
        fund: "Citadel Investment Group",
        source: "Seeking Alpha",
        href: "https://seekingalpha.com/1",
      },
      {
        id: "2",
        date: "2026.08.02",
        title: "Citadel buys Situational Awareness stock portfolio",
        fund: "Citadel Investment Group",
        source: "Bloomberg.com",
        href: "https://www.bloomberg.com/2",
      },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].source, "Bloomberg.com");
    assert.equal(out[0].relatedSources?.[0]?.source, "Seeking Alpha");
  });
});
