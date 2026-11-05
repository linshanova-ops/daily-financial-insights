import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { englishSourceNames, readerLine, stripInternalShorthand } from "./reader-shorthand.mjs";

const aug19 = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../content/briefings/2026-08-19.md",
);

describe("reader shorthand", () => {
  it("drops the oil shorthand and keeps the clause already in the title", () => {
    const title = readerLine("Oil is Iran-CLAIM beta — not a Hormuz flow print");
    assert.equal(title, "Not a Hormuz flow print");
    assert.equal(/\bCLAIM\b|Iran-CLAIM/.test(title), false);
  });

  it("labels a line that is only the shorthand", () => {
    assert.equal(readerLine("Oil is Iran-CLAIM beta."), "Early test. Summary omitted.");
    assert.equal(readerLine("（CLAIM — 见闻）"), "早期测试期，摘要从略。");
  });

  it("keeps a sentence after the tag is removed", () => {
    const line = stripInternalShorthand(
      "美银分析师称英伟达极具吸引力（CLAIM — inbox）",
    );
    assert.equal(line, "美银分析师称英伟达极具吸引力");
  });

  it("maps Chinese desk names on the English line only", () => {
    assert.equal(englishSourceNames("华尔街见闻 and 律动"), "Wallstreetcn and BlockBeats");
    assert.equal(englishSourceNames("华尔街见闻"), "Wallstreetcn");
    assert.equal(
      englishSourceNames("彭博财经早茶 Nov 5"),
      "Bloomberg Markets Daily China Nov 5",
    );
    assert.equal(
      englishSourceNames("彭博 Markets Daily China / 财经早茶"),
      "Bloomberg Markets Daily China",
    );
    assert.equal(readerLine("财经早茶", "en"), "Markets Daily China");
    assert.equal(readerLine("律动 原油收盘"), "律动 原油收盘");
    assert.equal(readerLine("律动 原油收盘", "en"), "BlockBeats 原油收盘");
    assert.equal(readerLine("（CLAIM — 见闻）", "en"), "早期测试期，摘要从略。");

    const desks = ["华尔街见闻", "第一财经", "财经早茶", "今日图表", "同花顺", "共同社", "新华社", "财新", "律动", "见闻", "彭博"];
    const briefing = JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public/data/briefings/2026-11-05.json"),
        "utf8",
      ),
    );
    const enLines = [];
    const labels = [];
    const walk = (value) => {
      if (!value || typeof value !== "object") return;
      if (typeof value.en === "string") enLines.push(value.en);
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (key === "label" && typeof child === "string") labels.push(child);
        else if (child && typeof child === "object") walk(child);
      }
    };
    walk(briefing);
    for (const line of enLines) {
      const shown = readerLine(line, "en");
      for (const desk of desks) {
        assert.equal(shown.includes(desk), false, `${desk} still in ${shown}`);
      }
    }
    for (const label of labels) {
      const shown = readerLine(label, "en");
      for (const desk of desks) {
        assert.equal(shown.includes(desk), false, `${desk} still in ${shown}`);
      }
    }
    assert.equal(labels.some((label) => label.includes("华尔街见闻")), true);
    assert.equal(labels.some((label) => label.includes("律动")), true);
    assert.equal(readerLine(labels.find((label) => label.includes("律动"))), labels.find((label) => label.includes("律动")));
  });

  it("leaves no CLAIM in the 19 Aug briefing", () => {
    const raw = fs.readFileSync(aug19, "utf8");
    const shown = stripInternalShorthand(raw);
    assert.equal(/\bCLAIM\b|Iran-CLAIM beta/.test(shown), false);
    assert.equal(shown.includes("Oil is Iran"), false);
  });
});
