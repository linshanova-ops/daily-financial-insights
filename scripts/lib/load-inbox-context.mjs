/**
 * Load saved inbox newsletter markdown for injection into the generate prompt.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INBOX_SOURCES, inboxRelPath, isoWeekKey } from "./inbox-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

function readIfExists(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return null;
  return { path: rel, body: fs.readFileSync(abs, "utf8") };
}

/**
 * @param {string} briefingDate YYYY-MM-DD (Beijing)
 * @returns {{ path: string, body: string, sourceId: string, label: string, keepLanguage: string }[]}
 */
export function loadInboxForBriefing(briefingDate) {
  const out = [];
  for (const source of INBOX_SOURCES) {
    let rel;
    if (source.cadence === "daily") {
      rel = `web/content/inbox/${source.id}/${briefingDate}.md`;
    } else {
      // Prefer current ISO week; also accept yesterday's week boundary files via scan
      const week = isoWeekKey(new Date(`${briefingDate}T12:00:00.000Z`));
      rel = `web/content/inbox/${source.id}/${week}.md`;
      if (!fs.existsSync(path.join(root, rel))) {
        // fallback: newest file in folder
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
      });
    }
  }
  return out;
}

export function formatInboxPromptBlock(items) {
  if (!items.length) {
    return `INBOX NEWSLETTERS: none captured for this run. Proceed without them (do not invent).`;
  }
  const parts = items.map((item, i) => {
    const langRule =
      item.keepLanguage === "zh"
        ? "Keep quotes/bullets taken from this source in CHINESE (do not translate to English)."
        : "You may keep English as in the source.";
    // Cap each body so the agent prompt stays bounded
    const body =
      item.body.length > 14000
        ? `${item.body.slice(0, 14000)}\n\n[truncated]`
        : item.body;
    return `### Inbox ${i + 1}: ${item.label} (\`${item.path}\`)
${langRule}
Merge into existing modules only (China/Global/Assets/Watch as appropriate). Cite label "${item.label}".

\`\`\`newsletter
${body}
\`\`\``;
  });
  return `INBOX NEWSLETTERS (captured from Gmail IMAP — required when present):
${parts.join("\n\n")}`;
}
