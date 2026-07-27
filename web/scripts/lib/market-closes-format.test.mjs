import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changeDirection,
  formatBpChange,
  formatLevel,
  formatPctChange,
  formatSignedPct,
  parseUsDate,
  withYahooMetaFallback,
  unixToDateString,
} from "./market-closes-format.mjs";

describe("market-closes-format", () => {
  it("formats levels with thousands separators", () => {
    assert.equal(formatLevel(7533.77), "7,533.77");
    assert.equal(formatLevel(4.57, { decimals: 2, suffix: "%" }), "4.57%");
    assert.equal(formatLevel(63825, { decimals: 0, prefix: "$" }), "$63,825");
  });

  it("formats percent and bp changes with direction", () => {
    assert.equal(formatPctChange(100, 99.49), "−0.51%");
    assert.equal(formatSignedPct(1.47), "+1.47%");
    assert.equal(formatBpChange(4.55, 4.57), "+2.0 bp");
    assert.equal(changeDirection("−0.51%"), "down");
    assert.equal(changeDirection("+2.0 bp"), "up");
  });

  it("parses dates", () => {
    assert.equal(parseUsDate("07/16/2026"), "2026-07-16");
    assert.equal(unixToDateString(1784208600), "2026-07-16");
  });

  it("uses Yahoo meta when the latest session timestamp has a null close", () => {
    const pairs = [
      { t: 1784832600, c: 7408.3 },
    ];
    const result = withYahooMetaFallback(pairs, {
      regularMarketPrice: 7411.98,
      regularMarketTime: 1784928395,
    });
    assert.deepEqual(result, [
      { t: 1784832600, c: 7408.3 },
      { t: 1784928395, c: 7411.98 },
    ]);
  });

  it("does not duplicate a Yahoo meta quote already represented by chart data", () => {
    const pairs = [{ t: 1784928395, c: 7411.98 }];
    assert.deepEqual(
      withYahooMetaFallback(pairs, {
        regularMarketPrice: 7411.98,
        regularMarketTime: 1784928400,
      }),
      pairs,
    );
  });
});
