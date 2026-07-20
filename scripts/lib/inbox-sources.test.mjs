import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatBloombergForPrompt,
  parseBloombergSections,
} from "./inbox-bloomberg-sections.mjs";
import {
  extractBloombergDateKey,
  formatInboxMarkdown,
  inboxRelPath,
  isPlaceholderInboxCapture,
  isWelcomeNewsletter,
  isoWeekKey,
  pickSource,
  summarizeInboxBody,
} from "./inbox-sources.mjs";
import { formatInboxPromptBlock } from "./load-inbox-context.mjs";

describe("pickSource", () => {
  it("matches Bloomberg Markets Daily China", () => {
    const src = pickSource(
      "Bloomberg News Chinese <newschinese@bloomberg.net>",
      "Markets Daily China 中文版",
    );
    assert.equal(src?.id, "bloomberg-markets-daily-china");
    assert.equal(src?.keepLanguage, "zh");
  });

  it("matches Glassnode Insights / Week on Chain", () => {
    const src = pickSource(
      "Glassnode <insights@glassnode.com>",
      "Glassnode Insights: Weekly On-Chain",
    );
    assert.equal(src?.id, "glassnode-insights");
    assert.equal(src?.cadence, "weekly");
    assert.equal(
      pickSource("team@glassnode.com", "Week on Chain — July 21")?.id,
      "glassnode-insights",
    );
  });

  it("ignores Glassnode welcome and studio promo", () => {
    assert.equal(
      pickSource(
        "Glassnode <insights@glassnode.com>",
        "Welcome to Glassnode Insights",
      ),
      null,
    );
    assert.equal(
      pickSource("Glassnode <hello@glassnode.com>", "Get to know Glassnode Studio"),
      null,
    );
  });

  it("ignores unrelated mail", () => {
    assert.equal(pickSource("noreply@example.com", "Your receipt"), null);
  });
});

describe("welcome helpers", () => {
  it("detects welcome subjects", () => {
    assert.equal(isWelcomeNewsletter("Welcome to Glassnode Insights"), true);
    assert.equal(
      isWelcomeNewsletter("Glassnode Insights: Weekly On-Chain"),
      false,
    );
  });

  it("detects placeholder captures", () => {
    const md = formatInboxMarkdown({
      source: {
        id: "glassnode-insights",
        label: "Glassnode Insights",
        cadence: "weekly",
        keepLanguage: "en",
        citeHref: "https://insights.glassnode.com/tag/newsletter/",
      },
      subject: "Welcome to Glassnode Insights",
      from: "insights@glassnode.com",
      date: new Date("2026-07-20T00:00:00.000Z"),
      text: "Thanks for signing up to receive Glassnode newsletters.",
    });
    assert.equal(isPlaceholderInboxCapture(md), true);
  });
});

describe("inbox paths", () => {
  it("daily path uses calendar day", () => {
    const src = pickSource("bloomberg@bloomberg.net", "Markets Daily China");
    const p = inboxRelPath(src, new Date("2026-07-21T01:00:00.000Z"));
    assert.equal(
      p,
      "web/content/inbox/bloomberg-markets-daily-china/2026-07-21.md",
    );
  });

  it("weekly path uses ISO week", () => {
    const src = pickSource("team@glassnode.com", "Glassnode Insights");
    const key = isoWeekKey(new Date("2026-07-21T12:00:00.000Z"));
    assert.match(key, /^2026-W\d{2}$/);
    const p = inboxRelPath(src, new Date("2026-07-21T12:00:00.000Z"));
    assert.equal(p, `web/content/inbox/glassnode-insights/${key}.md`);
  });
});

describe("formatInboxMarkdown", () => {
  it("includes frontmatter citeHref and body", () => {
    const src = pickSource("bloomberg@x.com", "Markets Daily China 中文版");
    const md = formatInboxMarkdown({
      source: src,
      subject: "Markets Daily China 中文版",
      from: "bloomberg@x.com",
      date: new Date("2026-07-20T00:00:00.000Z"),
      text: "全球市况\n标普500指数",
    });
    assert.match(md, /sourceId: bloomberg-markets-daily-china/);
    assert.match(md, /keepLanguage: zh/);
    assert.match(md, /citeHref: "https:\/\/www\.bloomberg\.com\/asia"/);
    assert.match(md, /全球市况/);
  });
});

describe("extractBloombergDateKey", () => {
  it("reads Chinese subject date", () => {
    assert.equal(
      extractBloombergDateKey("彭博 Markets Daily China 中文版 — 2026年7月20日"),
      "2026-07-20",
    );
  });

  it("returns null when missing", () => {
    assert.equal(extractBloombergDateKey("Markets Daily China"), null);
  });
});

describe("parseBloombergSections", () => {
  const sample = `开场一两句。

全球市况
标普500指数涨1%
纳斯达克涨2%

国际要闻
美联储官员讲话

大中华新闻
A股反弹

市场一览
风险偏好回升

经济数据日程
明日CPI

央行和政府动态
央行逆回购
`;

  it("splits labeled sections", () => {
    const sections = parseBloombergSections(sample);
    const ids = sections.map((s) => s.id);
    assert.ok(ids.includes("globalTape"));
    assert.ok(ids.includes("international"));
    assert.ok(ids.includes("greaterChina"));
    assert.ok(ids.includes("marketOverview"));
    assert.ok(ids.includes("calendar"));
    assert.ok(ids.includes("policy"));
  });

  it("fences tape in prompt format", () => {
    const out = formatBloombergForPrompt(sample);
    assert.match(out, /Mergeable sections/);
    assert.match(out, /国际要闻/);
    assert.match(out, /CROSS-CHECK ONLY/);
    assert.match(out, /标普500/);
  });
});

describe("summarizeInboxBody", () => {
  it("strips urls and caps length", () => {
    const long = `Theme A\nhttps://track.example.com/x?a=1\n${"word ".repeat(4000)}`;
    const out = summarizeInboxBody(long, { maxChars: 200 });
    assert.ok(out.length <= 280);
    assert.doesNotMatch(out, /track\.example/);
    assert.match(out, /truncated/);
  });
});

describe("formatInboxPromptBlock", () => {
  it("notes soft-fail status for caveats", () => {
    const block = formatInboxPromptBlock([], {
      ok: false,
      reason: "auth failed",
    });
    assert.match(block, /FAILED/);
    assert.match(block, /caveats/);
    assert.match(block, /none captured/);
  });

  it("includes stable cite for bloomberg item", () => {
    const block = formatInboxPromptBlock([
      {
        path: "web/content/inbox/bloomberg-markets-daily-china/2026-07-21.md",
        body: `---
sourceId: bloomberg-markets-daily-china
---

国际要闻
测试要闻
`,
        sourceId: "bloomberg-markets-daily-china",
        label: "彭博 Markets Daily China 中文版",
        keepLanguage: "zh",
        citeHref: "https://www.bloomberg.com/asia",
      },
    ]);
    assert.match(block, /bloomberg\.com\/asia/);
    assert.match(block, /keySources/);
    assert.match(block, /国际要闻/);
  });
});
