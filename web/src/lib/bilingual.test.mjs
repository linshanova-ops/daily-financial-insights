import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { checkBilingual } from "../../scripts/lib/bilingual-check.mjs";

describe("latest briefing languages", () => {
  it("gives every rendered sentence an English sentence and a Chinese sentence", () => {
    const latest = JSON.parse(
      readFileSync(new URL("../../public/data/latest.json", import.meta.url), "utf8"),
    );
    const result = checkBilingual(latest);
    assert.equal(result.ok, true, result.message);
    assert.equal(latest.summary[0].text.en.startsWith("The S&P 500"), true);
    assert.match(latest.summary[0].text.zh, /标普500/);
  });
});
