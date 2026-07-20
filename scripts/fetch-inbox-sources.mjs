/**
 * Fetch subscribed newsletters from Gmail IMAP into web/content/inbox/.
 *
 * Sources:
 *   - bloomberg-markets-daily-china (daily, Chinese — keep zh)
 *   - glassnode-insights (weekly, usually Tuesday)
 *
 * Env:
 *   INBOX_IMAP_HOST (default imap.gmail.com)
 *   INBOX_IMAP_USER
 *   INBOX_IMAP_PASSWORD
 *   INBOX_IMAP_PORT (default 993)
 *   BRIEFING_DATE (optional YYYY-MM-DD Asia/Shanghai briefing day)
 *
 * Usage:
 *   node scripts/fetch-inbox-sources.mjs
 *   node scripts/fetch-inbox-sources.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { beijingDateString } from "./lib/briefing-slot-gate.mjs";
import {
  extractBloombergDateKey,
  formatInboxMarkdown,
  inboxRelPath,
  isPlaceholderInboxCapture,
  pickSource,
} from "./lib/inbox-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const host = process.env.INBOX_IMAP_HOST || "imap.gmail.com";
const user = process.env.INBOX_IMAP_USER || "";
const pass = process.env.INBOX_IMAP_PASSWORD || "";
const port = Number(process.env.INBOX_IMAP_PORT || 993);
const briefingDate = process.env.BRIEFING_DATE || beijingDateString();
const asJson = process.argv.includes("--json");

function addressListToString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => v.address || v.name || String(v))
      .filter(Boolean)
      .join(", ");
  }
  if (value.text) return value.text;
  if (value.value) return addressListToString(value.value);
  return String(value);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function fetchRecentMessages(client, { days = 10, limit = 40 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // Gmail: search last N days in INBOX
  const uids = await client.search({ since }, { uid: true });
  if (!uids?.length) return [];

  const slice = uids.slice(-limit);
  const out = [];
  for await (const msg of client.fetch(
    slice,
    { uid: true, source: true, envelope: true },
    { uid: true },
  )) {
    out.push(msg);
  }
  return out;
}

async function main() {
  if (!user || !pass) {
    console.error(
      "[inbox] Missing INBOX_IMAP_USER / INBOX_IMAP_PASSWORD — skip fetch.",
    );
    process.exitCode = 0;
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, reason: "missing-secrets", saved: [] }, null, 2)}\n`,
      );
    }
    return;
  }

  console.log(
    `[inbox] connecting ${host}:${port} as ${user} (briefingDate=${briefingDate})`,
  );

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const saved = [];
  const seenWeekly = new Set();

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const messages = await fetchRecentMessages(client);
      console.log(`[inbox] scanned ${messages.length} recent message(s)`);

      // Newest first
      messages.sort((a, b) => Number(b.uid) - Number(a.uid));

      for (const msg of messages) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = addressListToString(parsed.from);
        const subject = parsed.subject || "";
        const source = pickSource(from, subject);
        if (!source) continue;

        const when = parsed.date || new Date();
        // Daily: prefer subject 年月日 (Bloomberg title), else Beijing/UTC day of email
        if (source.cadence === "daily") {
          const subjectDay =
            source.id === "bloomberg-markets-daily-china"
              ? extractBloombergDateKey(subject)
              : null;
          const emailDay = when.toISOString().slice(0, 10);
          const bjDay = beijingDateString(when);
          const matchesBriefing =
            subjectDay === briefingDate ||
            (!subjectDay &&
              (emailDay === briefingDate || bjDay === briefingDate));
          if (!matchesBriefing) continue;
        }

        if (source.cadence === "weekly") {
          if (seenWeekly.has(source.id)) continue;
          seenWeekly.add(source.id);
        }

        const rel = inboxRelPath(
          source,
          source.cadence === "daily"
            ? new Date(`${briefingDate}T12:00:00.000Z`)
            : when,
        );
        // Skip if daily already saved for briefingDate
        const abs = path.join(root, rel);
        if (source.cadence === "daily" && fs.existsSync(abs)) {
          console.log(`[inbox] exists ${rel} — keep`);
          saved.push({ sourceId: source.id, path: rel, skipped: true });
          continue;
        }
        if (source.cadence === "weekly" && fs.existsSync(abs)) {
          const existing = fs.readFileSync(abs, "utf8");
          // Replace signup/welcome placeholders; keep a real weekly Insights.
          if (!isPlaceholderInboxCapture(existing)) {
            console.log(`[inbox] weekly exists ${rel} — keep`);
            saved.push({ sourceId: source.id, path: rel, skipped: true });
            continue;
          }
          console.log(`[inbox] weekly placeholder ${rel} — replace`);
        }

        const text =
          (parsed.text || "").trim() ||
          (parsed.html
            ? String(parsed.html)
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : "");

        if (!text || text.length < 40) {
          console.warn(`[inbox] skip empty body: ${subject}`);
          continue;
        }

        const md = formatInboxMarkdown({
          source,
          subject,
          from,
          date: when,
          text,
        });
        ensureDir(abs);
        fs.writeFileSync(abs, md.endsWith("\n") ? md : `${md}\n`);
        console.log(`[inbox] saved ${rel} (${text.length} chars)`);
        saved.push({
          sourceId: source.id,
          path: rel,
          subject,
          from,
          chars: text.length,
        });

        // One daily bloomberg per run is enough
        if (source.cadence === "daily") {
          // continue scanning for weekly
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error(`[inbox] fetch failed: ${err?.message || err}`);
    // Soft-fail — briefing can continue without inbox sources
    process.exitCode = 0;
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, reason: String(err?.message || err), saved }, null, 2)}\n`,
      );
    }
    return;
  }

  console.log(`[inbox] done — ${saved.length} file(s)`);
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ ok: true, briefingDate, saved }, null, 2)}\n`,
    );
  }
}

main();
