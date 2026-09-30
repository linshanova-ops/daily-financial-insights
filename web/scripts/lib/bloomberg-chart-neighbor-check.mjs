/**
 * Empty 今日图表 has no caption. The figure must not be copied from the
 * section beside it. Weekday publish hits this from verify-briefing.
 */
import { parseBloombergSections } from "../../../scripts/lib/inbox-bloomberg-sections.mjs";

// ponytail: 6-char window. Raise if a real PNG caption shares a phrase with the neighbor section.
const SPAN = 6;

function mailBody(text) {
  const raw = String(text || "");
  if (!raw.startsWith("---")) return raw;
  const end = raw.indexOf("\n---", 3);
  return end === -1 ? raw : raw.slice(end + 4);
}

function compact(text) {
  return String(text || "").replace(/[^\p{Script=Han}\p{N}A-Za-z]+/gu, "");
}

function sharesSpan(writeup, source) {
  const a = compact(writeup);
  const b = compact(source);
  if (b.length < SPAN) return false;
  for (let i = 0; i + SPAN <= b.length; i++) {
    if (a.includes(b.slice(i, i + SPAN))) return true;
  }
  return false;
}

/** Previous and next section text when 今日图表 itself is empty. */
export function neighborTextWhenChartEmpty(mailText) {
  const sections = parseBloombergSections(mailBody(mailText));
  const idx = sections.findIndex((s) => s.chartOfDay);
  if (idx < 0 || sections[idx].body.trim()) return "";
  return [sections[idx - 1]?.body, sections[idx + 1]?.body]
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {string} mailText inbox markdown
 * @param {string} writeup figure title + analysis
 */
export function checkEmptyChartNotNeighbor(mailText, writeup) {
  const neighbor = neighborTextWhenChartEmpty(mailText);
  if (!neighbor || !sharesSpan(writeup, neighbor)) return { ok: true };
  return {
    ok: false,
    message:
      "bloomberg-chart-of-day copies the section beside an empty 今日图表; " +
      "title and analysis have to come from the PNG",
  };
}
