import assert from "node:assert/strict";
import { it } from "node:test";
import { spineTitle, spineTopic } from "../../scripts/lib/spine-title.mjs";

it("packs up to two short clauses for a book spine", () => {
  const zh = "美股下跌，英伟达首席执行官卸任。美国总统淡化与伊朗达成协议之后，原油价格上涨。";
  assert.equal(spineTitle(zh, "zh"), "美股下跌与原油上涨");
  assert.equal(spineTitle("周五是近五个月来美股最差的一天。", "zh"), "周五是近五个月来美…");
  assert.equal(
    spineTitle("US stocks fell as Nvidia's chief executive stepped down, and crude prices rose."),
    "US stocks fell, crude rose",
  );
  assert.equal(spineTitle("Jul 21 A-share rally (Shanghai +1.79%, ChiNext +7.05%) led."), "Jul 21 A-share rally led");
});

it("picks the topic named first", () => {
  assert.equal(spineTopic("Oil Relief, Nvidia Worries"), "oil");
  assert.equal(spineTopic("Hot CPI, Chips Sink"), "rates");
  assert.equal(spineTopic("Waller Eyes a Hold"), "rates");
  assert.equal(spineTopic("S&P Record Close"), "stocks");
});
