import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkBloombergChartDate } from "./bloomberg-chart-date-check.mjs";

describe("checkBloombergChartDate", () => {
  it("allows omitting the figure", () => {
    assert.equal(checkBloombergChartDate({ date: "2026-08-19" }).ok, true);
  });
  it("allows today's PNG", () => {
    assert.equal(
      checkBloombergChartDate({
        date: "2026-08-19",
        figures: [
          {
            id: "bloomberg-chart-of-day",
            imageSrc: "/inbox-charts/bloomberg-2026-08-19.png",
          },
        ],
      }).ok,
      true,
    );
  });
  it("rejects yesterday's PNG as today's 今日图表", () => {
    const r = checkBloombergChartDate({
      date: "2026-08-19",
      figures: [
        {
          id: "bloomberg-chart-of-day",
          imageSrc: "/inbox-charts/bloomberg-2026-08-18.png",
        },
      ],
    });
    assert.equal(r.ok, false);
  });
});
