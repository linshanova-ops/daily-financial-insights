/**
 * Extract Bloomberg 今日图表 image from a parsed email (CID / inline / nearby <img>).
 */

const SECTION_END =
  /大中华新闻|国际要闻|市场一览|全球市况|经济数据日程|央行和政府动态|今日要点/;

const MIN_CHART_BYTES = 8_000; // skip logos / tracking pixels
const MAX_CHART_BYTES = 4_000_000;

/**
 * @param {string} html
 * @returns {{ src: string, alt: string }[]}
 */
export function listHtmlImages(html) {
  const out = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const tag = m[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bsrc=([^\s>]+)/i)?.[1] ||
      "";
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] || "";
    if (src) out.push({ src: src.trim(), alt: alt.trim(), index: m.index });
  }
  return out;
}

/**
 * Find <img> tags that sit after 今日图表 and before the next major section.
 * @param {string} html
 */
export function findChartOfDayImageRefs(html) {
  const raw = String(html || "");
  const startMatch = raw.match(/今日图表|图表点评|图说|Chart of the Day/i);
  if (!startMatch || startMatch.index == null) return [];
  const from = startMatch.index;
  const rest = raw.slice(from);
  const endMatch = rest.slice(startMatch[0].length).match(SECTION_END);
  const slice = endMatch
    ? rest.slice(0, startMatch[0].length + endMatch.index)
    : rest.slice(0, 12_000);
  return listHtmlImages(slice);
}

function normalizeCid(value) {
  return String(value || "")
    .trim()
    .replace(/^cid:/i, "")
    .replace(/^<|>$/g, "")
    .toLowerCase();
}

function extForContentType(ct = "") {
  const t = String(ct).toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("gif")) return "gif";
  if (t.includes("webp")) return "webp";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  return "jpg";
}

function attachmentBytes(att) {
  if (!att?.content) return 0;
  if (Buffer.isBuffer(att.content)) return att.content.length;
  if (att.content instanceof Uint8Array) return att.content.length;
  if (typeof att.content === "string") return Buffer.byteLength(att.content);
  return Number(att.size) || 0;
}

function asBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (typeof content === "string") return Buffer.from(content, "binary");
  return null;
}

/**
 * Score attachments: prefer large images referenced near 今日图表.
 * @param {any} parsed mailparser result
 */
export function pickBloombergChartAttachment(parsed) {
  const html = parsed?.html || "";
  const attachments = Array.isArray(parsed?.attachments)
    ? parsed.attachments
    : [];
  const nearRefs = findChartOfDayImageRefs(html);
  const nearCids = new Set(
    nearRefs
      .map((r) => normalizeCid(r.src))
      .filter((s) => s && !/^https?:/i.test(s) && !s.startsWith("data:")),
  );

  /** @type {{ att: any, score: number, reason: string }[]} */
  const scored = [];
  for (const att of attachments) {
    const ct = String(att.contentType || att.contentType || "").toLowerCase();
    if (!ct.startsWith("image/")) continue;
    const bytes = attachmentBytes(att);
    if (bytes < MIN_CHART_BYTES || bytes > MAX_CHART_BYTES) continue;
    const cid = normalizeCid(att.cid || att.contentId || "");
    const name = String(att.filename || att.name || "").toLowerCase();
    let score = Math.min(bytes / 1000, 500);
    let reason = `size=${bytes}`;
    if (cid && nearCids.has(cid)) {
      score += 10_000;
      reason += "+near-今日图表-cid";
    }
    if (/chart|graph|figure|今日|图表/.test(name + " " + (att.cid || ""))) {
      score += 2_000;
      reason += "+name";
    }
    // Penalize obvious chrome
    if (/logo|pixel|spacer|icon|header|footer|social/.test(name + cid)) {
      score -= 5_000;
      reason += "-chrome";
    }
    scored.push({ att, score, reason });
  }

  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) return null;

  // If nothing was near the section, still take the largest non-chrome image
  // when the email clearly has a 今日图表 header (image-only chart).
  const hasHeader = /今日图表|图表点评|图说|Chart of the Day/i.test(html);
  let best = scored[0];
  if (hasHeader && !String(best.reason).includes("near-今日图表")) {
    const large = scored.find((s) => s.score > 0 && attachmentBytes(s.att) >= 25_000);
    if (large) {
      best = large;
      best.reason += "+largest-fallback";
    }
  }

  const buf = asBuffer(best.att.content);
  if (!buf) return null;
  return {
    buffer: buf,
    contentType: best.att.contentType || "image/jpeg",
    ext: extForContentType(best.att.contentType),
    filename: best.att.filename || null,
    cid: best.att.cid || null,
    bytes: buf.length,
    reason: best.reason,
    alt:
      nearRefs.find((r) => normalizeCid(r.src) === normalizeCid(best.att.cid))
        ?.alt || "",
  };
}

/**
 * If HTML points at https image near 今日图表 (no CID), return that URL.
 */
export function findChartOfDayRemoteUrl(html) {
  const refs = findChartOfDayImageRefs(html);
  for (const r of refs) {
    if (/^https?:\/\//i.test(r.src) && !/pixel|track|spacer|logo/i.test(r.src)) {
      return { url: r.src, alt: r.alt || "" };
    }
  }
  return null;
}

/**
 * Public site path for a saved chart (consumed by figures[].imageSrc).
 */
export function bloombergChartPublicPath(briefingDate, ext = "jpg") {
  return `/inbox-charts/bloomberg-${briefingDate}.${ext}`;
}

export function bloombergChartRelPath(briefingDate, ext = "jpg") {
  return `web/public/inbox-charts/bloomberg-${briefingDate}.${ext}`;
}
