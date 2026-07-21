/**
 * Load saved inbox newsletter markdown for injection into the generate prompt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatBloombergForPrompt } from "./inbox-bloomberg-sections.mjs";
import {
  INBOX_CITE_HREFS,
  INBOX_SOURCES,
  isoWeekKey,
  stripInboxFrontmatter,
  summarizeInboxBody,
} from "./inbox-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

export const INBOX_LAST_FETCH_REL = "web/content/inbox/last-fetch.json";

function readIfExists(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  return { path: rel, body: fs.readFileSync(abs, "utf8") };
}

/**
 * @param {string} briefingDate YYYY-MM-DD (Beijing)
 * @returns {{ path: string, body: string, sourceId: string, label: string, keepLanguage: string, citeHref: string }[]}
 */
export function loadInboxForBriefing(briefingDate) {
  const out = [];
  for (const source of INBOX_SOURCES) {
    let rel;
    if (source.cadence === "daily") {
      rel = `web/content/inbox/${source.id}/${briefingDate}.md`;
    } else {
      const week = isoWeekKey(new Date(`${briefingDate}T12:00:00.000Z`));
      rel = `web/content/inbox/${source.id}/${week}.md`;
      if (!fs.existsSync(path.join(root, rel))) {
        const dir = path.join(root, "web/content/inbox", source.id);
        if (fs.existsSync(dir)) {
          const files = fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".md"))
            .sort()
            .reverse();
          if (files[0]) rel = `web/content/inbox/${source.id}/${files[0]}`;
        }
      }
    }
    const hit = readIfExists(rel);
    if (hit) {
      out.push({
        ...hit,
        sourceId: source.id,
        label: source.label,
        keepLanguage: source.keepLanguage,
        citeHref: source.citeHref || INBOX_CITE_HREFS[source.id] || "",
      });
    }
  }
  return out;
}

export function loadInboxFetchStatus() {
  const abs = path.join(root, INBOX_LAST_FETCH_REL);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

function readFrontmatterField(markdown, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = String(markdown || "").match(re);
  if (!m) return "";
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function formatOneInboxItem(item, index) {
  const langRule =
    item.keepLanguage === "zh"
      ? "Keep quotes/bullets taken from this source in CHINESE (do not translate to English)."
      : "You may keep English as in the source.";
  const citeHref =
    item.citeHref || INBOX_CITE_HREFS[item.sourceId] || "";
  const citeRule = citeHref
    ? `Cite as { label: "${item.label}", href: "${citeHref}" } — never email tracking links.`
    : `Cite label "${item.label}" with a stable public landing page — never email tracking links.`;

  const chartImage = readFrontmatterField(item.body, "chartImage");
  const chartAlt = readFrontmatterField(item.body, "chartAlt");
  const chartRule = chartImage
    ? `今日图表 IMAGE (REQUIRED): file \`${chartImage}\` is already in the repo (also under web/public/inbox-charts/). Add figures[] entry id=bloomberg-chart-of-day, kind=insight with imageSrc: "${chartImage}", title, and required analysis. Open/read the image first — title+analysis must match the chart content (not a neighboring news bullet). Keep Chinese OK. Keep the image file in the PR commit.`
    : item.sourceId === "bloomberg-markets-daily-china"
      ? "今日图表: if section header exists but no chartImage frontmatter, still add insight analysis from section text when possible."
      : "";

  const rawBody = stripInboxFrontmatter(item.body);
  let prepared;
  if (item.sourceId === "bloomberg-markets-daily-china") {
    prepared = formatBloombergForPrompt(rawBody);
  } else if (item.sourceId === "glassnode-insights") {
    prepared = summarizeInboxBody(rawBody, { maxChars: 5500 });
  } else {
    prepared = summarizeInboxBody(rawBody, { maxChars: 8000 });
  }

  return `### Inbox ${index + 1}: ${item.label} (\`${item.path}\`)
${langRule}
${citeRule}
${chartRule}
FULL COVERAGE: merge **all** newsletter sections (国际要闻 + 大中华新闻 + 市场一览 + 日程/央行动态 + 今日图表) into Global/China/Assets/Watch/Figures — not China-only cherry-picks. Add this source to keySources when used.

\`\`\`newsletter
${prepared}
\`\`\``;
}

export function formatInboxPromptBlock(items, fetchStatus = null) {
  const statusLines = [];
  if (fetchStatus) {
    if (fetchStatus.ok === false) {
      statusLines.push(
        `INBOX FETCH STATUS: FAILED (${fetchStatus.reason || "unknown"}). Add a short caveats/singleSource note that inbox newsletters were unavailable this run. Do not invent newsletter content.`,
      );
    } else {
      const n = Array.isArray(fetchStatus.saved) ? fetchStatus.saved.length : 0;
      statusLines.push(
        `INBOX FETCH STATUS: ok — ${n} capture action(s) this run (see last-fetch.json).`,
      );
    }
  }

  if (!items.length) {
    return [
      ...statusLines,
      `INBOX NEWSLETTERS: none captured for this run. Proceed without them (do not invent).`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const parts = items.map((item, i) => formatOneInboxItem(item, i));
  return [
    ...statusLines,
    `INBOX NEWSLETTERS (captured from Gmail IMAP — required when present):`,
    parts.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}
