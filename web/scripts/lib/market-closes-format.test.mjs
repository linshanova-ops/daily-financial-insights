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
  selectDisplayedBar,
  unixToDateString,
  yahooPrevIsUsable,
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

  it("uses the previous completed close for an open Nikkei or Kospi session", () => {
    const snap = "2026-10-28T01:19:25.942Z";
    const t = (day) => Date.parse(`${day}T00:00:00Z`) / 1000;
    const pairs = [
      { t: t("2026-10-26"), c: 62189.65 },
      { t: t("2026-10-27"), c: 63268.37 },
      { t: t("2026-10-28"), c: 63960.59 },
    ];
    for (const id of ["nikkei", "kospi"]) {
      const bar = selectDisplayedBar(id, pairs, snap);
      assert.equal(unixToDateString(bar.last.t), "2026-10-27");
      assert.equal(bar.last.c, 63268.37);
    }
    assert.equal(unixToDateString(selectDisplayedBar("brent", pairs, snap).last.t), "2026-10-28");
    assert.equal(
      unixToDateString(selectDisplayedBar("nikkei", pairs, "2026-10-28T07:00:00.000Z").last.t),
      "2026-10-28",
    );
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

  it("seeds prev from chartPreviousClose when Yahoo returns one daily bar", () => {
    const pairs = [{ t: 1789709126, c: 4390.16 }];
    const result = withYahooMetaFallback(pairs, {
      regularMarketPrice: 4390.16,
      regularMarketTime: 1789709126,
      chartPreviousClose: 4310.74,
    });
    assert.deepEqual(result, [
      { t: 1789709126 - 86400, c: 4310.74 },
      { t: 1789709126, c: 4390.16 },
    ]);
    assert.equal(formatPctChange(result[0].c, result[1].c), "+1.84%");
  });

  it("does not seed a previous close that is the same bar", () => {
    const pairs = [{ t: 1791187706, c: 4183.68017578125 }];
    assert.deepEqual(
      withYahooMetaFallback(pairs, {
        regularMarketPrice: 4183.68,
        regularMarketTime: 1791187706,
        chartPreviousClose: 4183.68,
      }),
      pairs,
    );
    assert.equal(yahooPrevIsUsable(4183.68, 4183.68017578125), false);
    assert.equal(yahooPrevIsUsable(4157.94, 4183.68), true);
  });
});
