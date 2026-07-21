/**
 * Fetch subscribed newsletters from Gmail IMAP into web/content/inbox/.
 *
 * Sources:
 *   - bloomberg-markets-daily-china (daily Chinese digests: Markets Daily / 财经早茶)
 *   - glassnode-insights (weekly Week on Chain — not webinar promos)
 *
 * Scans INBOX plus Gmail All Mail / Updates-like labels when present.
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
import { hasBloombergChartOfDay } from "./lib/inbox-bloomberg-sections.mjs";
import {
  bloombergChartPublicPath,
  bloombergChartRelPath,
  findChartOfDayRemoteUrl,
  pickBloombergChartAttachment,
} from "./lib/inbox-bloomberg-chart-image.mjs";
import {
  extractBloombergDateKey,
  formatInboxMarkdown,
  inboxRelPath,
  isAgentReformattedInboxCapture,
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
    subject.includes("彭博") ||
    subject.includes("中文版") ||
    subject.includes("全球市况") ||
    subject.includes("早茶")
  );
}

async function listCandidateMailboxes(client) {
  /** @type {string[]} */
  const out = ["INBOX"];
  try {
    // imapflow: list() returns Promise<MailboxObject[]>, not an async iterable
    const boxes = await client.list();
    for (const box of boxes || []) {
      const pathName = box.path || box.name || "";
      if (!pathName || pathName === "INBOX") continue;
      const lower = pathName.toLowerCase();
      if (
        lower.includes("all mail") ||
        lower.includes("updates") ||
        pathName.includes("更新") ||
        lower === "[gmail]/all mail"
      ) {
        out.push(pathName);
      }
    }
  } catch (err) {
    console.warn(`[inbox] list mailboxes failed: ${err?.message || err}`);
  }
  return [...new Set(out)];
}

async function fetchRecentMessages(client, mailbox, { days = 14, limit = 60 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let lock;
  try {
    lock = await client.getMailboxLock(mailbox);
  } catch (err) {
    console.warn(`[inbox] open ${mailbox} failed: ${err?.message || err}`);
    return [];
  }
  try {
    const uids = await client.search({ since }, { uid: true });
    if (!uids?.length) return [];
    const slice = uids.slice(-limit);
    const out = [];
    for await (const msg of client.fetch(
      slice,
      { uid: true, source: true, envelope: true },
      { uid: true },
    )) {
      out.push({ ...msg, _mailbox: mailbox });
    }
    return out;
  } finally {
    lock.release();
  }
}

function existingReceivedAt(abs) {
  try {
    const md = fs.readFileSync(abs, "utf8");
    const m = md.match(/^receivedAt:\s*["']([^"']+)["']/m);
    if (!m) return null;
    const d = new Date(m[1]);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Prefer text/plain; for HTML-only mail keep block breaks so 今日图表 stays a header. */
function emailBodyToText(parsed) {
  const plain = (parsed.text || "").trim();
  const html = parsed.html ? String(parsed.html) : "";
  const fromHtml = html.trim()
    ? html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<(br|BR)\s*\/?\s*>/g, "\n")
        .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article|header|footer)>/gi, "\n")
        .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, "\n$1\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, n) => {
          const code = Number(n);
          return Number.isFinite(code) ? String.fromCharCode(code) : " ";
        })
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim()
    : "";

  const plainHasChart = /今日图表|图表点评|图说|Chart of the Day/i.test(plain);
  const htmlHasChart = /今日图表|图表点评|图说|Chart of the Day/i.test(fromHtml);
  if (plain.length >= 40 && plainHasChart) return plain;
  if (fromHtml.length >= 40 && htmlHasChart) return fromHtml;
  if (plain.length >= 40) return plain;
  return fromHtml || plain;
}

/**
 * Save 今日图表 image next to public assets. Returns public path or null.
 */
async function saveBloombergChartImage(parsed, briefingDate) {
  const picked = pickBloombergChartAttachment(parsed);
  if (picked?.buffer) {
    const rel = bloombergChartRelPath(briefingDate, picked.ext);
    const abs = path.join(root, rel);
    ensureDir(abs);
    fs.writeFileSync(abs, picked.buffer);
    console.log(
      `[inbox] chart image saved ${rel} (${picked.bytes} bytes, ${picked.reason})`,
    );
    return {
      publicPath: bloombergChartPublicPath(briefingDate, picked.ext),
      rel,
      alt: picked.alt || "",
      bytes: picked.bytes,
    };
  }

  const remote = findChartOfDayRemoteUrl(parsed?.html || "");
  if (remote?.url) {
    try {
      const res = await fetch(remote.url, {
        headers: { "user-agent": "syravocado-inbox-fetch/1.0" },
        redirect: "follow",
      });
      if (!res.ok) {
        console.warn(`[inbox] chart remote fetch HTTP ${res.status}`);
        return null;
      }
      const ct = res.headers.get("content-type") || "image/jpeg";
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 8000) {
        console.warn(`[inbox] chart remote too small (${buf.length}) — skip`);
        return null;
      }
      const ext = ct.includes("png")
        ? "png"
        : ct.includes("webp")
          ? "webp"
          : ct.includes("gif")
            ? "gif"
            : "jpg";
      const rel = bloombergChartRelPath(briefingDate, ext);
      const absImg = path.join(root, rel);
      ensureDir(absImg);
      fs.writeFileSync(absImg, buf);
      console.log(`[inbox] chart image downloaded ${rel} (${buf.length} bytes)`);
      return {
        publicPath: bloombergChartPublicPath(briefingDate, ext),
        rel,
        alt: remote.alt || "",
        bytes: buf.length,
      };
    } catch (err) {
      console.warn(`[inbox] chart remote fetch failed: ${err?.message || err}`);
    }
  }

  console.log("[inbox] no 今日图表 image attachment found");
  return null;
}

async function main() {
  if (!user || !pass) {
    console.error(
      "[inbox] Missing INBOX_IMAP_USER / INBOX_IMAP_PASSWORD — skip fetch.",
    );
    writeFetchStatus({
      ok: false,
      reason: "missing-secrets",
      saved: [],
      skipped: [],
    });
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
  const seenMessageKeys = new Set();

  try {
    await client.connect();
    const mailboxes = await listCandidateMailboxes(client);
    console.log(`[inbox] mailboxes: ${mailboxes.join(" | ")}`);

    /** @type {any[]} */
    const messages = [];
    for (const box of mailboxes) {
      const batch = await fetchRecentMessages(client, box);
      console.log(`[inbox] ${box}: ${batch.length} recent message(s)`);
      messages.push(...batch);
    }
    console.log(
      `[inbox] scanned ${messages.length} message(s) across mailboxes`,
    );

    messages.sort((a, b) => {
      const da = a.envelope?.date ? new Date(a.envelope.date).getTime() : 0;
      const db = b.envelope?.date ? new Date(b.envelope.date).getTime() : 0;
      if (db !== da) return db - da;
      return Number(b.uid) - Number(a.uid);
    });

    for (const msg of messages) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      const from = addressListToString(parsed.from);
      const subject = parsed.subject || "";
      const dedupeKey = `${(parsed.messageId || "").trim()}|${from}|${subject}`;
      if (seenMessageKeys.has(dedupeKey)) continue;
      seenMessageKeys.add(dedupeKey);

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
        const existingMd = fs.readFileSync(abs, "utf8");
        const chartRelCandidates = ["jpg", "png", "webp", "gif"].map((ext) =>
          path.join(root, bloombergChartRelPath(briefingDate, ext)),
        );
        const hasChartFile = chartRelCandidates.some((p) => fs.existsSync(p));
        if (
          source.id === "bloomberg-markets-daily-china" &&
          hasBloombergChartOfDay(existingMd) &&
          !hasChartFile
        ) {
          console.log(
            `[inbox] exists ${rel} — replace to extract 今日图表 image`,
          );
        } else if (isAgentReformattedInboxCapture(existingMd)) {
          console.log(
            `[inbox] exists ${rel} — replace agent-reformatted capture (restore raw IMAP)`,
          );
        } else {
          const prev = existingReceivedAt(abs);
          if (prev && when <= prev) {
            const existingHasChart = hasBloombergChartOfDay(existingMd);
            const incomingPreview =
              (parsed.text || "") + " " + (parsed.html || "");
            if (
              source.id === "bloomberg-markets-daily-china" &&
              !existingHasChart &&
              hasBloombergChartOfDay(incomingPreview)
            ) {
              console.log(
                `[inbox] exists ${rel} — replace to recover 今日图表 section`,
              );
            } else {
              console.log(`[inbox] exists ${rel} — keep (not newer)`);
              skipped.push({ reason: "exists-keep", subject, path: rel });
              saved.push({ sourceId: source.id, path: rel, skipped: true });
              continue;
            }
          } else {
            console.log(`[inbox] exists ${rel} — replace with newer`);
          }
        }
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

      const text = emailBodyToText(parsed);

      if (!text || text.length < 40) {
        console.warn(`[inbox] skip empty body: ${subject}`);
        skipped.push({ reason: "empty-body", subject, from });
        continue;
      }

      let chartImage = null;
      let chartAlt = "";
      let chartRel = null;
      if (source.id === "bloomberg-markets-daily-china") {
        const chart = await saveBloombergChartImage(parsed, briefingDate);
        if (chart) {
          chartImage = chart.publicPath;
          chartAlt = chart.alt || "";
          chartRel = chart.rel;
        }
      }

      const md = formatInboxMarkdown({
        source,
        subject,
        from,
        date: when,
        text,
        chartImage,
        chartAlt,
      });
      ensureDir(abs);
      fs.writeFileSync(abs, md.endsWith("\n") ? md : `${md}\n`);
      console.log(
        `[inbox] saved ${rel} (${text.length} chars) from ${msg._mailbox || "?"}${chartImage ? ` chart=${chartImage}` : ""}`,
      );
      saved.push({
        sourceId: source.id,
        path: rel,
        subject,
        from,
        chars: text.length,
        mailbox: msg._mailbox || "",
        chartImage: chartImage || undefined,
        chartRel: chartRel || undefined,
      });
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
