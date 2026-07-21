import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findChartOfDayImageRefs,
  pickBloombergChartAttachment,
} from "./inbox-bloomberg-chart-image.mjs";
import { formatBloombergForPrompt, parseBloombergSections } from "./inbox-bloomberg-sections.mjs";

describe("bloomberg chart image extract", () => {
  it("finds img refs between 今日图表 and next section", () => {
    const html = `
      <h2>国际要闻</h2><img src="cid:noise" />
      <h2>今日图表</h2>
      <img src="cid:chart123" alt="对冲基金科技仓位" />
      <h2>大中华新闻</h2><img src="cid:after" />
    `;
    const refs = findChartOfDayImageRefs(html);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].src, "cid:chart123");
    assert.match(refs[0].alt, /对冲基金/);
  });

  it("picks the CID attachment near 今日图表 over logos", () => {
    const chartBuf = Buffer.alloc(20_000, 1);
    const logoBuf = Buffer.alloc(12_000, 2);
    const picked = pickBloombergChartAttachment({
      html: `今日图表 <img src="cid:chart123@bloomberg" /> 大中华新闻`,
      attachments: [
        {
          contentType: "image/png",
          cid: "logo@bloomberg",
          filename: "logo.png",
          content: logoBuf,
        },
        {
          contentType: "image/jpeg",
          cid: "chart123@bloomberg",
          filename: "chart.jpg",
          content: chartBuf,
        },
      ],
    });
    assert.ok(picked);
    assert.equal(picked.bytes, 20_000);
    assert.match(picked.reason, /near-今日图表/);
  });
});

describe("empty 今日图表 section still required", () => {
  it("keeps chartOfDay with empty body for image-only emails", () => {
    const text = `国际要闻\n一条新闻\n\n今日图表\n\n\n大中华新闻\n另一条\n`;
    const sections = parseBloombergSections(text);
    assert.ok(sections.some((s) => s.id === "chartOfDay"));
    const out = formatBloombergForPrompt(text);
    assert.match(out, /今日图表 → Figures/);
    assert.match(out, /imageSrc/);
  });
});
