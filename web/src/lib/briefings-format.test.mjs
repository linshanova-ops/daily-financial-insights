import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dropRestatedScale, otherHasSameAmount } from "../../scripts/lib/scale-paren.mjs";

describe("dropRestatedScale", () => {
  it("drops a parenthetical that restates the same amount", () => {
    const title =
      "Job openings rose to 7.523 million (752.3), above a 7.164 million (716.4) survey.";
    const out = dropRestatedScale(title);
    assert.equal(
      out,
      "Job openings rose to 7.523 million, above a 7.164 million survey.",
    );
    assert.equal(out.includes("(752.3)"), false);
    assert.equal(out.includes("(716.4)"), false);
    assert.equal(dropRestatedScale("752.3万（7.523），高于 716.4万（7.164）"), "752.3万，高于 716.4万");
    assert.equal(dropRestatedScale("6.3 billion dollar (63)"), "6.3 billion dollar");
    assert.equal(dropRestatedScale("119 million dollars (1.19)"), "119 million dollars");
    assert.equal(dropRestatedScale("1.19亿美元（119）"), "1.19亿美元");
    assert.equal(dropRestatedScale("100 亿元（CNY10bn）"), "100 亿元");
  });

  it("leaves a parenthetical that is a different number", () => {
    assert.equal(dropRestatedScale("7.523 million (999)"), "7.523 million (999)");
  });

  it("treats 万 and million as the same amount", () => {
    assert.equal(otherHasSameAmount("7.523", "职位空缺升至 752.3万"), true);
    assert.equal(otherHasSameAmount("752.3", "rose to 7.523 million"), true);
    assert.equal(otherHasSameAmount("4.9435", "收益率 4.90%"), false);
    assert.equal(otherHasSameAmount("86,000", "增加8.6万"), true);
    assert.equal(otherHasSameAmount("8.6", "rose by 86,000 jobs"), true);
  });
});
