import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { editionZhEntries, zhText } from "./edition-zh.ts";

const latest = JSON.parse(
  readFileSync(new URL("../../public/data/latest.json", import.meta.url), "utf8"),
);

function latin(s) {
  return (s.match(/[A-Za-z]/g) || []).length;
}
function cjk(s) {
  return (s.match(/[\u4e00-\u9fff]/g) || []).length;
}
function nums(s) {
  return s.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || [];
}

function readerStrings(j) {
  const out = [];
  const add = (s) => {
    if (typeof s === "string" && s.trim()) out.push(s);
  };
  add(j.title);
  add(j.coverageWindow);
  add(j.marketTone);
  add(j.signal);
  add(j.watch);
  add(j.sources);
  add(j.singleSource);
  add(j.globalRegime);
  add(j.globalTensions);
  add(j.chinaStance);
  add(j.chinaDivergences);
  add(j.marketOverview?.note);
  add(j.marketDashboard?.note);
  add(j.eventCalendar?.note);
  for (const s of j.summary || []) add(s.text);
  for (const f of j.figures || []) {
    add(f.title);
    add(f.analysis);
  }
  for (const t of j.themeCards || []) {
    add(t.title);
    add(t.mechanism);
    add(t.trigger);
    add(t.invalidator);
    add(t.horizon);
    for (const a of t.assets || []) add(a);
  }
  for (const s of j.globalImplies || []) add(s.text);
  for (const s of j.chinaImplies || []) add(s.text);
  for (const e of j.eventCalendar?.events || []) add(e.event);
  for (const s of j.keySources || []) add(s.influence);
  return out;
}

describe("edition zh", () => {
  it("translates this edition's English prose and keeps every printed number", () => {
    const missing = readerStrings(latest).filter(
      (s) => latin(s) > 15 && latin(s) > cjk(s) && zhText(s) === s,
    );
    assert.deepEqual(missing, []);
    assert.equal(zhText("days"), "数日");
    assert.equal(zhText("Oil"), "原油");
    assert.equal(zhText("Brent futures (Yahoo)"), "Brent futures (Yahoo)");
    for (const [en, zh] of editionZhEntries()) {
      assert.equal(zh.includes("Platts") || zh.includes("普氏"), false, en.slice(0, 40));
      assert.equal(zh.includes("希望你喜欢"), false);
      for (const n of nums(en)) assert.equal(zh.includes(n), true, `${n} missing from ${en.slice(0, 48)}`);
    }
    const dash = zhText(latest.marketDashboard.note);
    assert.match(dash, /BZ=F/);
    assert.notEqual(dash, latest.marketDashboard.note);
  });
});
