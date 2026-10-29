import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assetZh, gradeZh, groupZh, regionZh, resolveLang, statusZh } from "./lang.ts";

describe("resolveLang", () => {
  it("uses ?lang= when it is zh or en, else keeps zh, else English", () => {
    assert.equal(resolveLang(null), "en");
    assert.equal(resolveLang("en"), "en");
    assert.equal(resolveLang("zh"), "zh");
    assert.equal(resolveLang("nope"), "en");
    assert.equal(resolveLang(null, "zh"), "zh");
    assert.equal(resolveLang("en", "zh"), "en");
  });
});

describe("chrome enums", () => {
  it("translates grades, statuses, and close groups; unknown rows stay", () => {
    assert.equal(gradeZh("STRONG"), "强");
    assert.equal(gradeZh("MODERATE"), "中");
    assert.equal(gradeZh("WEAK"), "弱");
    assert.equal(statusZh("escalated"), "升级");
    assert.equal(groupZh("global-equities", "Global equities"), "全球股市");
    assert.equal(groupZh("brent", "Brent futures (Yahoo)"), "Brent futures (Yahoo)");
    assert.equal(assetZh("spx", "S&P 500"), "标普500");
    assert.equal(assetZh("brent", "Brent futures (Yahoo)"), "布伦特期货（Yahoo）");
    assert.equal(assetZh("nope", "Some new print"), "Some new print");
    assert.equal(regionZh("Other"), "其他");
    assert.equal(regionZh("China"), "中国");
    assert.equal(regionZh("US"), "美国");
  });
});
