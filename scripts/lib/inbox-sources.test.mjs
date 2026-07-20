import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBloombergDateKey,
  formatInboxMarkdown,
  inboxRelPath,
  isPlaceholderInboxCapture,
  isWelcomeNewsletter,
  isoWeekKey,
  pickSource,
} from "./inbox-sources.mjs";

describe("pickSource", () => {
  it("matches Bloomberg Markets Daily China", () => {
    const src = pickSource(
      "Bloomberg News Chinese <newschinese@bloomberg.net>",
      "Markets Daily China 中文版",
    );
    assert.equal(src?.id, "bloomberg-markets-daily-china");
    assert.equal(src?.keepLanguage, "zh");
  });

  it("matches Glassnode Insights", () => {
    const src = pickSource(
      "Glassnode <insights@glassnode.com>",
      "Glassnode Insights: Weekly On-Chain",
    );
    assert.equal(src?.id, "glassnode-insights");
    assert.equal(src?.cadence, "weekly");
  });

  it("ignores Glassnode welcome mail", () => {
    assert.equal(
      pickSource(
        "Glassnode <insights@glassnode.com>",
        "Welcome to Glassnode Insights",
      ),
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
    const src = pickSource("team@glassnode.com", "Insights");
    // 2026-07-21 is a Tuesday
    const key = isoWeekKey(new Date("2026-07-21T12:00:00.000Z"));
    assert.match(key, /^2026-W\d{2}$/);
    const p = inboxRelPath(src, new Date("2026-07-21T12:00:00.000Z"));
    assert.equal(p, `web/content/inbox/glassnode-insights/${key}.md`);
  });
});

describe("formatInboxMarkdown", () => {
  it("includes frontmatter and body", () => {
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
