import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { readerLine, stripInternalShorthand } from "./reader-shorthand.mjs";

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

  it("leaves no CLAIM in the 19 Aug briefing", () => {
    const raw = fs.readFileSync(aug19, "utf8");
    const shown = stripInternalShorthand(raw);
    assert.equal(/\bCLAIM\b|Iran-CLAIM beta/.test(shown), false);
    assert.equal(shown.includes("Oil is Iran"), false);
  });
});
