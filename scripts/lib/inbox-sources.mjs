/**
 * Matchers + filename helpers for newsletter inbox sources (pure / testable).
 */

/** Stable public landing pages — never use email tracking links in cites. */
export const INBOX_CITE_HREFS = {
  "bloomberg-markets-daily-china": "https://www.bloomberg.com/asia",
  "glassnode-insights": "https://insights.glassnode.com/tag/newsletter/",
};

/** Signup / confirmation mail — not usable as briefing source. */
export function isWelcomeNewsletter(subject = "", text = "") {
  const s = String(subject).toLowerCase();
  const t = String(text).toLowerCase();
  if (s.includes("welcome to")) return true;
  if (s.startsWith("welcome ")) return true;
  if (t.includes("thanks for signing up")) return true;
  if (t.includes("thanks for subscribing")) return true;
  return false;
}

export const INBOX_SOURCES = [
  {
    id: "bloomberg-markets-daily-china",
    label: "彭博 Markets Daily China 中文版",
    cadence: "daily",
    /** Keep Chinese text when merging into the briefing. */
    keepLanguage: "zh",
    citeHref: INBOX_CITE_HREFS["bloomberg-markets-daily-china"],
    match({ from = "", subject = "" }) {
      if (isWelcomeNewsletter(subject)) return false;
      const f = from.toLowerCase();
      const s = subject.toLowerCase();
      const fromOk =
        f.includes("bloomberg") ||
        f.includes("newschinese@bloomberg") ||
        f.includes("@bloomberg.net");
      const subjectOk =
        s.includes("markets daily china") ||
        subject.includes("中文版") ||
        subject.includes("全球市况") ||
        s.includes("china markets");
      return fromOk && (subjectOk || s.includes("bloomberg"));
    },
  },
  {
    id: "glassnode-insights",
    label: "Glassnode Insights",
    cadence: "weekly",
    keepLanguage: "en",
    citeHref: INBOX_CITE_HREFS["glassnode-insights"],
    match({ from = "", subject = "" }) {
      if (isWelcomeNewsletter(subject)) return false;
      const f = from.toLowerCase();
      const s = subject.toLowerCase();
      const fromOk = f.includes("glassnode");
      // Tighten: real Insights / Week on Chain — not Studio promo blasts.
      if (s.includes("studio") && !s.includes("insight") && !s.includes("week")) {
        return false;
      }
      if (s.includes("intro video") || s.includes("get to know")) return false;
      const subjectOk =
        s.includes("week on chain") ||
        s.includes("week-on-chain") ||
        s.includes("weekonchain") ||
        (s.includes("insight") &&
          (s.includes("week") ||
            s.includes("on-chain") ||
            s.includes("onchain") ||
            s.includes("newsletter") ||
            /^glassnode insights\b/.test(s)));
      return fromOk && subjectOk;
    },
  },
];

export function pickSource(from, subject) {
  return INBOX_SOURCES.find((src) => src.match({ from, subject })) || null;
}

/**
 * Prefer Bloomberg subject date (Beijing calendar day in title) over IMAP Date.
 * Example: "彭博 Markets Daily China 中文版 — 2026年7月20日"
 */
export function extractBloombergDateKey(subject) {
  const m = String(subject || "").match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
}

/** ISO week key YYYY-Www for weekly dedupe. */
export function isoWeekKey(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function inboxRelPath(source, when = new Date()) {
  if (source.cadence === "weekly") {
    return `web/content/inbox/${source.id}/${isoWeekKey(when)}.md`;
  }
  const day = when.toISOString().slice(0, 10);
  return `web/content/inbox/${source.id}/${day}.md`;
}

/** True when a saved capture is signup mail and should be replaced. */
export function isPlaceholderInboxCapture(markdown = "") {
  const subject = markdown.match(/^subject:\s*(.+)$/m)?.[1] || "";
  const body = markdown.split(/\n---\n/).slice(1).join("\n---\n");
  return isWelcomeNewsletter(subject, body);
}

export function stripInboxFrontmatter(markdown = "") {
  const raw = String(markdown);
  if (!raw.startsWith("---")) return raw.trim();
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return raw.trim();
  return raw.slice(end + 4).trim();
}

/**
 * Cap Glassnode / long English newsletters: strip URL-only noise, keep head.
 */
export function summarizeInboxBody(text, { maxChars = 5500 } = {}) {
  let t = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trim()}\n\n[truncated — prefer on-chain themes already above]`;
}

export function formatInboxMarkdown({
  source,
  subject,
  from,
  date,
  text,
}) {
  const received = date instanceof Date ? date.toISOString() : String(date || "");
  return `---
sourceId: ${source.id}
sourceLabel: ${JSON.stringify(source.label)}
cadence: ${source.cadence}
keepLanguage: ${source.keepLanguage}
citeHref: ${JSON.stringify(source.citeHref || INBOX_CITE_HREFS[source.id] || "")}
subject: ${JSON.stringify(subject || "")}
from: ${JSON.stringify(from || "")}
receivedAt: ${JSON.stringify(received)}
---

${(text || "").trim()}
`;
}
