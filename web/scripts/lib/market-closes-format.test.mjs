import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changeDirection,
  formatBpChange,
  formatLevel,
  formatPctChange,
  formatSignedPct,
  parseUsDate,
  impliedPriorClose,
  withYahooMetaFallback,
  gapPrintNote,
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

  it("recovers the prior close from a stored day change", () => {
    const prior = impliedPriorClose("3,755.38", "+0.30%");
    assert.ok(Math.abs(prior - 3755.38 / 1.003) < 1e-6);
    assert.equal(formatPctChange(prior, 3754.9), "+0.29%");
    assert.equal(impliedPriorClose("10", "flat"), null);
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
    const mid = selectDisplayedBar("nikkei", pairs, "2026-10-28T06:10:00.000Z");
    assert.equal(unixToDateString(mid.last.t), "2026-10-27");
  });

  it("does not mark a completed Nikkei or Kospi close as a holiday or a missing session", () => {
    const snap = "2026-11-04T01:22:00.000Z";
    const t = (day) => Date.parse(`${day}T00:00:00Z`) / 1000;
    const holiday = selectDisplayedBar(
      "nikkei",
      [
        { t: t("2026-11-02"), c: 63081.86 },
        { t: t("2026-11-04"), c: 63100 },
      ],
      snap,
    );
    assert.equal(unixToDateString(holiday.last.t), "2026-11-02");
    assert.equal(holiday.gap, null);

    const stale = selectDisplayedBar("kospi", [{ t: t("2026-11-02"), c: 5859.08 }], snap);
    assert.equal(unixToDateString(stale.last.t), "2026-11-02");
    assert.equal(stale.gap, null);

    const other = selectDisplayedBar("spx", [{ t: t("2026-11-02"), c: 100 }], snap);
    assert.equal(other.gap.kind, "stale");
    assert.match(gapPrintNote(other.gap).en, /Missing session 2026-11-03/);

    const filled = selectDisplayedBar(
      "nikkei",
      [
        { t: t("2026-11-02"), c: 1 },
        { t: t("2026-11-03"), c: 2 },
        { t: t("2026-11-04"), c: 3 },
      ],
      snap,
    );
    assert.equal(unixToDateString(filled.last.t), "2026-11-03");
    assert.equal(filled.gap, null);
  });

  it("prints the completed 5 Nov Nikkei and Kospi close on the 6 Nov morning snapshot", () => {
    const snap = "2026-11-06T01:25:36.149Z";
    const t = (day) => Date.parse(`${day}T00:00:00Z`) / 1000;
    const nikkei = selectDisplayedBar(
      "nikkei",
      [
        { t: t("2026-11-04"), c: 62188.62890625 },
        { t: t("2026-11-05"), c: 61077.8984375 },
        { t: t("2026-11-06"), c: 57858.609375 },
      ],
      snap,
    );
    assert.equal(unixToDateString(nikkei.last.t), "2026-11-05");
    assert.equal(formatLevel(nikkei.last.c), "61,077.90");
    assert.equal(formatPctChange(nikkei.prev.c, nikkei.last.c), "−1.79%");
    assert.equal(nikkei.gap, null);

    const kospi = selectDisplayedBar(
      "kospi",
      [
        { t: t("2026-11-04"), c: 5683.7998046875 },
        { t: t("2026-11-05"), c: 5383.7998046875 },
        { t: t("2026-11-06"), c: 5131.79 },
      ],
      snap,
    );
    assert.equal(unixToDateString(kospi.last.t), "2026-11-05");
    assert.equal(formatLevel(kospi.last.c), "5,383.80");
    assert.equal(formatPctChange(kospi.prev.c, kospi.last.c), "−5.28%");
    assert.equal(kospi.gap, null);
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
