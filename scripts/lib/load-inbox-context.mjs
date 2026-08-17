/**
 * Load saved inbox newsletter markdown for injection into the generate prompt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatBloombergForPrompt } from "./inbox-bloomberg-sections.mjs";
import { isBeijingPostWeekendOpen } from "./briefing-slot-gate.mjs";
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
 * Newest YYYY-MM-DD.md on or before briefingDate, or null.
 * @param {string} sourceId
 * @param {string} briefingDate
 */
export function latestDailyInboxRel(sourceId, briefingDate) {
  const exact = `web/content/inbox/${sourceId}/${briefingDate}.md`;
  if (fs.existsSync(path.join(root, exact))) return exact;
  const dir = path.join(root, "web/content/inbox", sourceId);
  if (!fs.existsSync(dir)) return null;
  const days = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map((f) => f.slice(0, 10))
    .filter((d) => d <= briefingDate)
    .sort()
    .reverse();
  return days[0] ? `web/content/inbox/${sourceId}/${days[0]}.md` : null;
}

export function loadInboxForBriefing(briefingDate) {
  const out = [];
  for (const source of INBOX_SOURCES) {
    if (source.mondayOnly && !isBeijingPostWeekendOpen(briefingDate)) continue;
    let rel;
    if (source.cadence === "daily") {
      rel = latestDailyInboxRel(source.id, briefingDate);
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
    const hit = rel ? readIfExists(rel) : null;
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
  const glassnodeRule =
    item.sourceId === "glassnode-insights"
      ? `GLASSNODE WEEKLY (smooth merge): The email often only shows a summary + "Read full report" button; do NOT scrape or fetch that link from Actions. Use ONLY what is in this email body: extract 1–3 concrete on-chain themes/metrics (keep numbers exactly as written). Merge into: (1) globalChanged as ONE sourced line (on-chain / crypto regime), (2) signals[] when the email clearly supports a graded signal (evidence from email text; otherwise omit), (3) watchItems or globalImplies only if the email states a trigger. Cite Glassnode Insights (stable newsletter href — never tracking links). Optional figures[] entry id=glassnode-weekly kind=insight with analysis + 1–2 takeaway sentences — NO chart image unless one was saved under inbox-charts/.`
      : "";

  const chartRule = chartImage
    ? `今日图表 IMAGE (REQUIRED): file \`${chartImage}\` is already in the repo (also under web/public/inbox-charts/). Add figures[] entry id=bloomberg-chart-of-day, kind=insight with imageSrc: "${chartImage}", title, and required analysis. Open/read the PNG first and describe what the chart actually shows (series, units, standout levels, footnote). Forbidden placeholders: "邮件保存了今日图表" / "image saved" / "正文未附可读图注" without chart content. Tie 1 short so-what to today's tape only after the chart itself is explained. Keep Chinese OK. Keep the image file in the PR commit.${chartAlt ? ` chartAlt hint: ${chartAlt}` : ""}`
    : item.sourceId.startsWith("bloomberg-")
      ? "今日图表: if section header exists but no chartImage frontmatter, still add insight analysis from section text when possible — never invent a generic geopolitics blurb in place of the chart."
      : "";

  const rawBody = stripInboxFrontmatter(item.body);
  let prepared;
  if (item.sourceId.startsWith("bloomberg-")) {
    prepared = formatBloombergForPrompt(rawBody);
  } else if (item.sourceId === "glassnode-insights") {
    prepared = summarizeInboxBody(rawBody, { maxChars: 3200 });
  } else {
    prepared = summarizeInboxBody(rawBody, { maxChars: 3500 });
  }

  return `### Inbox ${index + 1}: ${item.label} (\`${item.path}\`)
${langRule}
${citeRule}
${glassnodeRule}
${chartRule}
Merge all sections: 国际要闻→globalChanged, 大中华→chinaChanged, 市场一览→marketOverview, 日程/政策→watchItems, 今日图表→figures.

\`\`\`newsletter
${prepared}
\`\`\``;
}

export function formatInboxPromptBlock(items, fetchStatus = null) {
  const statusLines = [];
  if (fetchStatus) {
    if (fetchStatus.ok === false) {
      statusLines.push(
        `INBOX FETCH STATUS: FAILED (${fetchStatus.reason || "unknown"}). Merge any captures listed below — do not invent newsletter content. If none listed, add a short caveats/singleSource note.`,
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
