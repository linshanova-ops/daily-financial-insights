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
import { INBOX_LAST_FETCH_REL } from "./lib/load-inbox-context.mjs";
import {
  extractBloombergDateKey,
  formatInboxMarkdown,
  inboxRelPath,
  isPlaceholderInboxCapture,
  isWelcomeNewsletter,
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

function writeFetchStatus(payload) {
  const abs = path.join(root, INBOX_LAST_FETCH_REL);
  ensureDir(abs);
  const body = {
    at: new Date().toISOString(),
    briefingDate,
    ...payload,
  };
  fs.writeFileSync(abs, `${JSON.stringify(body, null, 2)}\n`);
}

function looksInteresting(from, subject) {
  const blob = `${from} ${subject}`.toLowerCase();
  return (
    blob.includes("bloomberg") ||
    blob.includes("glassnode") ||
    subject.includes("中文版") ||
    subject.includes("全球市况")
  );
}

async function fetchRecentMessages(client, { days = 10, limit = 40 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
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

function existingReceivedAt(abs) {
  try {
    const md = fs.readFileSync(abs, "utf8");
    const m = md.match(/^receivedAt:\s*"([^"]+)"/m);
    if (!m) return null;
    const d = new Date(m[1]);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

async function main() {
  if (!user || !pass) {
    console.error(
      "[inbox] Missing INBOX_IMAP_USER / INBOX_IMAP_PASSWORD — skip fetch.",
    );
    writeFetchStatus({ ok: false, reason: "missing-secrets", saved: [], skipped: [] });
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
  const skipped = [];
  const seenWeekly = new Set();

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const messages = await fetchRecentMessages(client);
      console.log(`[inbox] scanned ${messages.length} recent message(s)`);

      messages.sort((a, b) => Number(b.uid) - Number(a.uid));

      for (const msg of messages) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = addressListToString(parsed.from);
        const subject = parsed.subject || "";

        if (isWelcomeNewsletter(subject, parsed.text || "")) {
          console.log(`[inbox] skip welcome: ${subject}`);
          skipped.push({ reason: "welcome", subject, from });
          continue;
        }

        const source = pickSource(from, subject);
        if (!source) {
          if (looksInteresting(from, subject)) {
            console.log(`[inbox] skip unmatched: ${subject} | from=${from}`);
            skipped.push({ reason: "unmatched", subject, from });
          }
          continue;
        }

        const when = parsed.date || new Date();
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
          if (!matchesBriefing) {
            console.log(
              `[inbox] skip date-mismatch: ${subject} (subjectDay=${subjectDay || "n/a"} emailDay=${emailDay} bjDay=${bjDay} want=${briefingDate})`,
            );
            skipped.push({
              reason: "date-mismatch",
              subject,
              from,
              subjectDay,
              emailDay,
              bjDay,
              briefingDate,
            });
            continue;
          }
        }

        if (source.cadence === "weekly") {
          if (seenWeekly.has(source.id)) {
            console.log(`[inbox] skip weekly-duplicate: ${subject}`);
            skipped.push({ reason: "weekly-duplicate", subject, from });
            continue;
          }
          seenWeekly.add(source.id);
        }

        const rel = inboxRelPath(
          source,
          source.cadence === "daily"
            ? new Date(`${briefingDate}T12:00:00.000Z`)
            : when,
        );
        const abs = path.join(root, rel);

        if (source.cadence === "daily" && fs.existsSync(abs)) {
          const prev = existingReceivedAt(abs);
          // Refresh if a newer same-day mail arrived (evening backfill).
          if (prev && when <= prev) {
            console.log(`[inbox] exists ${rel} — keep (not newer)`);
            skipped.push({ reason: "exists-keep", subject, path: rel });
            saved.push({ sourceId: source.id, path: rel, skipped: true });
            continue;
          }
          console.log(`[inbox] exists ${rel} — replace with newer`);
        }

        if (source.cadence === "weekly" && fs.existsSync(abs)) {
          const existing = fs.readFileSync(abs, "utf8");
          if (!isPlaceholderInboxCapture(existing)) {
            console.log(`[inbox] weekly exists ${rel} — keep`);
            skipped.push({ reason: "weekly-exists", subject, path: rel });
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
          skipped.push({ reason: "empty-body", subject, from });
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
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error(`[inbox] fetch failed: ${err?.message || err}`);
    writeFetchStatus({
      ok: false,
      reason: String(err?.message || err),
      saved,
      skipped,
    });
    process.exitCode = 0;
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, reason: String(err?.message || err), saved, skipped }, null, 2)}\n`,
      );
    }
    return;
  }

  writeFetchStatus({ ok: true, saved, skipped });
  console.log(
    `[inbox] done — ${saved.filter((s) => !s.skipped).length} saved, ${skipped.length} skipped`,
  );
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ ok: true, briefingDate, saved, skipped }, null, 2)}\n`,
    );
  }
}

main();
