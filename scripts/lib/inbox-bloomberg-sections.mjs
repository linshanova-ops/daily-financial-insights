/**
 * Split 彭博 Markets Daily China body into labeled sections for reliable merge.
 */

export const BLOOMBERG_SECTION_DEFS = [
  {
    id: "lede",
    title: "导语 / 要点",
    mergeTo: "summary (optional) + china opener",
    patterns: [/^导语/, /^今日要点/, /^核心要点/, /^要点/],
  },
  {
    id: "chartOfDay",
    title: "今日图表",
    mergeTo:
      "figures[] as kind=insight (REQUIRED when present) — title + clear analysis point",
    chartOfDay: true,
    patterns: [/^今日图表/, /^图表点评/, /^图表/],
  },
  {
    id: "globalTape",
    title: "全球市况",
    mergeTo: "CROSS-CHECK ONLY — never replace marketDashboard",
    tapeOnly: true,
    patterns: [/^全球市况/],
  },
  {
    id: "international",
    title: "国际要闻",
    mergeTo: "globalChanged",
    patterns: [/^国际要闻/],
  },
  {
    id: "greaterChina",
    title: "大中华新闻",
    mergeTo: "chinaChanged",
    patterns: [/^大中华新闻/, /^大中华/],
  },
  {
    id: "marketOverview",
    title: "市场一览",
    mergeTo: "assetFramework drivers",
    patterns: [/^市场一览/],
  },
  {
    id: "calendar",
    title: "经济数据日程",
    mergeTo: "watch / watchItems",
    patterns: [/^经济数据日程/, /^数据日程/],
  },
  {
    id: "policy",
    title: "央行和政府动态",
    mergeTo: "watch / watchItems",
    patterns: [/^央行和政府动态/, /^央行动态/, /^政府动态/],
  },
];

function matchHeader(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;
  for (const def of BLOOMBERG_SECTION_DEFS) {
    if (def.patterns.some((re) => re.test(trimmed))) return def;
  }
  return null;
}

/**
 * @returns {{ id: string, title: string, mergeTo: string, tapeOnly?: boolean, chartOfDay?: boolean, body: string }[]}
 */
export function parseBloombergSections(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const sections = [];
  let current = {
    id: "preamble",
    title: "开篇",
    mergeTo: "summary / china opener if substantive",
    tapeOnly: false,
    chartOfDay: false,
    lines: [],
  };

  for (const line of lines) {
    const header = matchHeader(line);
    if (header) {
      if (current.lines.some((l) => l.trim())) {
        sections.push({
          id: current.id,
          title: current.title,
          mergeTo: current.mergeTo,
          tapeOnly: current.tapeOnly,
          chartOfDay: current.chartOfDay,
          body: current.lines.join("\n").trim(),
        });
      }
      current = {
        id: header.id,
        title: header.title,
        mergeTo: header.mergeTo,
        tapeOnly: Boolean(header.tapeOnly),
        chartOfDay: Boolean(header.chartOfDay),
        lines: [],
      };
      continue;
    }
    current.lines.push(line);
  }

  if (current.lines.some((l) => l.trim())) {
    sections.push({
      id: current.id,
      title: current.title,
      mergeTo: current.mergeTo,
      tapeOnly: current.tapeOnly,
      chartOfDay: current.chartOfDay,
      body: current.lines.join("\n").trim(),
    });
  }

  return sections.filter((s) => s.body.length > 0);
}

/**
 * Build prompt-ready Bloomberg text: labeled sections; tape fenced separately.
 */
export function formatBloombergForPrompt(text, { maxSectionChars = 3500 } = {}) {
  const sections = parseBloombergSections(text);
  if (!sections.length) {
    const fallback = String(text || "").trim();
    return fallback
      ? `(unsectioned body — merge carefully; ignore tape-like index tables for marketDashboard)\n\n${fallback.slice(0, 8000)}`
      : "(empty)";
  }

  const mergeable = [];
  const chartDay = [];
  const tape = [];
  for (const s of sections) {
    const body =
      s.body.length > maxSectionChars
        ? `${s.body.slice(0, maxSectionChars)}\n\n[truncated]`
        : s.body;
    const block = `### ${s.title}\nMerge → ${s.mergeTo}\n\n${body}`;
    if (s.tapeOnly) tape.push(block);
    else if (s.chartOfDay) chartDay.push(block);
    else mergeable.push(block);
  }

  const parts = [];
  if (chartDay.length) {
    parts.push(
      "## 今日图表 → Figures (REQUIRED)\nAdd ONE figures[] entry with kind: insight, id: bloomberg-chart-of-day.\n- title: short chart theme (Chinese OK)\n- analysis: one clear so-what sentence (required) — what the chart implies for today's risk/policy/tape\n- display/delta: only if a hard number is stated in the section (do not invent)\n- source: 彭博 Markets Daily China / 财经早茶 stable citeHref\nKeep analysis Chinese if the section is Chinese.\n\n" +
        chartDay.join("\n\n"),
    );
  }
  if (mergeable.length) {
    parts.push("## Mergeable sections\n\n" + mergeable.join("\n\n"));
  }
  if (tape.length) {
    parts.push(
      "## 全球市况 tape (CROSS-CHECK ONLY)\nDo NOT copy these levels into marketDashboard. Market Dashboard comes only from fetch-market-closes.\n\n" +
        tape.join("\n\n"),
    );
  }
  return parts.join("\n\n");
}
