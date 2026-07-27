import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifySourceTier,
  isConfirmableSource,
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
});
