import assert from "node:assert/strict";
import { it } from "node:test";
import { spineTitle } from "./spine-title.ts";

it("keeps the first clause and caps it for a book spine", () => {
  assert.equal(spineTitle("美股下跌，英伟达首席执行官卸任。", "zh"), "美股下跌");
  assert.equal(spineTitle("周五是近五个月来美股最差的一天。", "zh"), "周五是近五个月来美…");
  assert.equal(spineTitle("US stocks rose, and crude prices fell."), "US stocks rose");
  assert.equal(
    spineTitle("US stocks fell as Nvidia's chief executive stepped down, and crude rose."),
    "US stocks fell as Nvidia's…",
  );
  assert.equal(spineTitle("Jul 21 A-share rally (Shanghai +1.79%, ChiNext +7.05%) led."), "Jul 21 A-share rally led");
});
