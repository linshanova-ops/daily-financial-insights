import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySourceTier,
  isConfirmableSource,
  sourcePrestigeRank,
  sourceTierLabel,
} from "./fund-sources.mjs";
import { cleanFundQueues } from "./fund-queue-clean.mjs";

describe("fund source tiers", () => {
  it("marks Hedgeweek as designated", () => {
    assert.equal(
      classifySourceTier({ source: "Hedgeweek", title: "Point72 expands" }),
      "designated",
    );
    assert.equal(sourceTierLabel("designated"), "指定信源");
  });

  it("marks Bloomberg as secondary", () => {
    assert.equal(
      classifySourceTier({
        source: "Bloomberg.com",
        title: "Asia hedge funds hit by AI rout",
      }),
      "secondary",
    );
  });

  it("allows WSJ / NYT / Business Insider / Seeking Alpha as secondary", () => {
    for (const source of [
      "WSJ",
      "The New York Times",
      "Business Insider",
      "Seeking Alpha",
    ]) {
      assert.equal(
        classifySourceTier({
          source,
          title: "Citadel buys Situational Awareness portfolio",
        }),
        "secondary",
        source,
      );
      assert.equal(isConfirmableSource({ source, title: "x" }), true, source);
    }
  });

  it("treats unknown Google News publishers as weak", () => {
    const row = {
      source: "Tech Times",
      title: "Citadel Buys Situational Awareness Portfolio",
      href: "https://www.techtimes.com/articles/x",
    };
    assert.equal(classifySourceTier(row), "weak");
    assert.equal(isConfirmableSource(row), false);
  });

  it("ranks prestige Bloomberg ahead of Seeking Alpha", () => {
    assert.ok(
      sourcePrestigeRank({ source: "Bloomberg.com" }) <
        sourcePrestigeRank({ source: "Seeking Alpha" }),
    );
  });

  it("blocks MarketBeat 13F spam from confirmed", () => {
    const row = {
      source: "MarketBeat",
      title:
        "Polar Asset Management Partners Inc. Makes New $8.07 Million Investment in Analog Devices",
      href: "https://www.marketbeat.com/instant-alerts/filing-x",
    };
    assert.equal(classifySourceTier(row), "weak");
    assert.equal(isConfirmableSource(row), false);
  });
});

describe("cleanFundQueues", () => {
  it("drops Meridiem→Citadel mis-attribution and MarketBeat filings", () => {
    const { signals, droppedSignals } = cleanFundQueues(
      [
        {
          id: "1",
          title: "Meridiem Capital rebuilds after Millennium Exit",
          fund: "Citadel Investment Group",
          source: "Hedgeweek",
        },
        {
          id: "2",
          title: "Viking Global calls conservative AI stance a Missed Opportunity",
          fund: "Viking Global Investors",
          source: "Hedgeweek",
        },
        {
          id: "3",
          title: "Polar Makes New Investment in AJG",
          fund: "Polar Asset Management Partners",
          source: "MarketBeat",
        },
      ],
      [],
    );
    assert.equal(droppedSignals, 2);
    assert.equal(signals.length, 1);
    assert.equal(signals[0].fund, "Viking Global Investors");
    assert.equal(signals[0].sourceTierLabel, "指定信源");
  });

  it("decodes HTML entities left in archived titles", () => {
    const { signals } = cleanFundQueues(
      [
        {
          id: "entity",
          date: "2026.07.31",
          title: "Millennium backs macro trader&#8217;s $1bn hedge fund launch",
          summary:
            "Millennium Capital Partners 组织/产品动向：Millennium backs macro trader&#8217;s $1bn hedge fund launch。",
          summaryEn:
            "Millennium Capital Partners: product / organization update — Millennium backs macro trader&#8217;s $1bn hedge fund launch.",
          fund: "Millennium Capital Partners",
          source: "Hedgeweek",
          href: "https://www.hedgeweek.com/x",
        },
      ],
      [],
    );
    assert.equal(signals.length, 1);
    assert.equal(
      signals[0].title,
      "Millennium backs macro trader’s $1bn hedge fund launch",
    );
    assert.ok(!/&#\d+;/.test(signals[0].summary));
    assert.ok(!/&#\d+;/.test(signals[0].summaryEn));
  });

  it("collapses same-story multi-outlet floods to one canonical cite", () => {
    const { signals, collapsedStories } = cleanFundQueues(
      [
        {
          id: "a",
          date: "2026.08.02",
          title:
            "Citadel buys most of Situational's stock holdings after AI share rout, sources say",
          fund: "Citadel Investment Group",
          source: "Reuters",
          href: "https://www.reuters.com/a",
        },
        {
          id: "b",
          date: "2026.08.02",
          title:
            "Exclusive | Citadel Buys Situational Awareness’s Stock Portfolio After Big Losses in AI",
          fund: "Citadel Investment Group",
          source: "WSJ",
          href: "https://www.wsj.com/b",
        },
        {
          id: "c",
          date: "2026.08.02",
          title:
            "A.I. Hedge Fund Situational Awareness Rescued by Rival Citadel",
          fund: "Citadel Investment Group",
          source: "The New York Times",
          href: "https://www.nytimes.com/c",
        },
        {
          id: "d",
          date: "2026.08.01",
          title: "Point72 expands quantitative hiring in London",
          fund: "Point72 Asset Management",
          source: "Hedgeweek",
          href: "https://www.hedgeweek.com/d",
        },
      ],
      [],
    );
    assert.equal(collapsedStories, 2);
    assert.equal(signals.length, 2);
    const citadel = signals.find((s) => /citadel/i.test(s.fund));
    assert.ok(citadel);
    assert.equal(citadel.source, "WSJ");
    assert.ok(citadel.relatedSources?.length >= 2);
  });
});
