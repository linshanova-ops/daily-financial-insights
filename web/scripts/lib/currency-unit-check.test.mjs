import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findBnYiMismatches } from "./currency-unit-check.mjs";

describe("findBnYiMismatches", () => {
  it("flags copied 亿 numerals mislabeled as bn", () => {
    const text = [
      "罚没携程51.79亿元",
      "Ctrip CNY51.79bn fine",
      "募资约579亿元",
      "688825 lists with a 579bn IPO",
      "拟回购200–400亿元",
      "CATL CNY200–400bn buyback",
    ].join("\n");

    const issues = findBnYiMismatches(text);
    assert.deepEqual(
      issues.map((x) => x.amount),
      ["51.79", "579", "200–400"],
    );
  });

  it("accepts correct bn conversions and ignores explicit USD amounts", () => {
    const text = [
      "罚没携程51.79亿元 / CNY5.179bn",
      "募资约579亿元 / CNY57.9bn",
      "拟回购200–400亿元 / CNY20–40bn",
      "Samsung–Broadcom $200bn MOU",
    ].join("\n");
    assert.deepEqual(findBnYiMismatches(text), []);
  });
});
