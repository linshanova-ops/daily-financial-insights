/** Pure formatting helpers for Market Dashboard rows. */

export function formatLevel(value, { decimals = 2, suffix = "", prefix = "" } = {}) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const body = n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${body}${suffix}`;
}

export function formatPctChange(from, to) {
  if (from == null || to == null || Number(from) === 0) return null;
  const pct = ((Number(to) - Number(from)) / Math.abs(Number(from))) * 100;
  return formatSignedPct(pct);
}

export function formatSignedPct(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return null;
  const n = Number(pct);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toFixed(2);
  return `${sign}${abs}%`;
}

/** Yield change in basis points (to − from) * 100. */
export function formatBpChange(from, to) {
  if (from == null || to == null) return null;
  const bp = (Number(to) - Number(from)) * 100;
  const sign = bp > 0 ? "+" : bp < 0 ? "−" : "";
  return `${sign}${Math.abs(bp).toFixed(1)} bp`;
}

export function changeDirection(changeText) {
  if (!changeText) return "flat";
  if (changeText.startsWith("+")) return "up";
  if (changeText.startsWith("−") || changeText.startsWith("-")) return "down";
  return "flat";
}

export function unixToDateString(unixSeconds) {
  if (unixSeconds == null) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10);
}

/**
 * Yahoo sometimes publishes a session timestamp with `close: null` while
 * exposing the completed official close in chart.meta. Append that quote only
 * when it belongs to a newer UTC session date than the last usable chart close.
 * Thin indexes (HSTECH.HK) often return one chart bar even on range=1mo;
 * day-change then lives in meta.chartPreviousClose.
 */
export function withYahooMetaFallback(pairs, meta = {}) {
  const out = [...pairs];
  const price = Number(meta.regularMarketPrice);
  const time = Number(meta.regularMarketTime);
  if (Number.isFinite(price) && Number.isFinite(time)) {
    const last = out[out.length - 1];
    if (!last || unixToDateString(time) > unixToDateString(last.t)) {
      out.push({ t: time, c: price });
    }
  }
  if (out.length === 1) {
    const prevClose = Number(meta.chartPreviousClose);
    // ponytail: a previous close that prints as 0.00% is the same bar, not a prior session.
    // Caller can then use the last published briefing level. Drop this when Yahoo sends history.
    if (Number.isFinite(prevClose) && prevClose !== 0 && yahooPrevIsUsable(prevClose, out[0].c)) {
      out.unshift({ t: out[0].t - 86400, c: prevClose });
    }
  }
  return out;
}

/**
 * Recover the prior session close from a stored day-change.
 * Used when Yahoo reprints the same session (one bar, chartPreviousClose identical)
 * and the last briefing already computed that session's change.
 */
export function impliedPriorClose(latest, changeText) {
  const n = Number(String(latest ?? "").replace(/[$,%]/g, "").replace(/,/g, ""));
  const m = String(changeText || "")
    .replace("−", "-")
    .match(/^([+-]?)(\d+(?:\.\d+)?)%$/);
  if (!Number.isFinite(n) || !m) return null;
  const pct = (m[1] === "-" ? -1 : 1) * Number(m[2]);
  const denom = 1 + pct / 100;
  if (!Number.isFinite(denom) || denom === 0) return null;
  return n / denom;
}

/** False when the only "previous" close rounds to a 0.00% day change. */
export function yahooPrevIsUsable(prev, last) {
  const formatted = formatPctChange(prev, last);
  return Boolean(formatted) && !/^([+−-])?0\.00%$/.test(formatted);
}

/**
 * Nikkei and Kospi can already be open at the morning snapshot. Walk back to
 * the latest bar whose session has finished. A weekday gap before a later bar
 * is a holiday; a weekday gap with no later bar is a stale print.
 * ponytail: a traded session missing from a feed that then resumes looks like
 * a holiday, and a holiday with no later bar yet looks stale. Upgrade path: an
 * exchange holiday list.
 * Same cash closes as session-print.ts. Other ids, including Brent, stay on the last bar.
 */
const PRIOR_CLOSE_IF_OPEN = {
  nikkei: { timeZone: "Asia/Tokyo", close: "15:30" },
  kospi: { timeZone: "Asia/Seoul", close: "15:30" },
};

function zonedEpoch(date, hhmm, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const want = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  let ms = want;
  for (let i = 0; i < 3; i++) {
    const map = {};
    for (const p of fmt.formatToParts(new Date(ms))) map[p.type] = p.value;
    const got = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute);
    ms += want - got;
  }
  return ms;
}

function sessionStillOpen(id, asOfDate, snapshotIso) {
  const spec = PRIOR_CLOSE_IF_OPEN[id];
  if (!spec || !asOfDate) return false;
  const snap = Date.parse(snapshotIso);
  if (!Number.isFinite(snap)) return false;
  return snap < zonedEpoch(asOfDate, spec.close, spec.timeZone);
}

function isoAddDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Weekdays strictly between two YYYY-MM-DD dates. Weekends are not sessions. */
function weekdaysBetween(start, end) {
  const dates = [];
  if (!start || !end || start >= end) return dates;
  let d = isoAddDays(start, 1);
  while (d < end) {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(d);
    d = isoAddDays(d, 1);
  }
  return dates;
}

/** Bar to print, the bar before it, and a holiday or stale gap when one exists. */
export function selectDisplayedBar(id, pairs, snapshotIso) {
  if (!pairs?.length) return { last: null, prev: null, gap: null };
  let i = pairs.length - 1;
  while (i >= 1 && sessionStillOpen(id, unixToDateString(pairs[i].t), snapshotIso)) i -= 1;
  const last = pairs[i];
  const newer = i + 1 < pairs.length ? pairs[i + 1] : null;
  const snap = Date.parse(snapshotIso);
  const end = newer
    ? unixToDateString(newer.t)
    : Number.isFinite(snap)
      ? new Date(snap).toISOString().slice(0, 10)
      : null;
  const dates = weekdaysBetween(unixToDateString(last.t), end);
  const gap = dates.length ? { kind: newer ? "holiday" : "stale", dates } : null;
  return { last, prev: i >= 1 ? pairs[i - 1] : null, gap };
}

/** Reader label for a gap. No backup price. */
export function gapPrintNote(gap) {
  if (!gap?.dates?.length) return null;
  const dates = gap.dates.join(", ");
  if (gap.kind === "holiday") {
    return {
      en: `Previous-session close. Holiday ${dates}.`,
      zh: `上一交易日收盘。休市 ${dates}。`,
    };
  }
  return {
    en: `Stale print. Missing session ${dates}.`,
    zh: `这是更早的收盘，缺了交易日 ${dates}。`,
  };
}

/** Parse MM/DD/YYYY treasury CSV date → YYYY-MM-DD */
export function parseUsDate(mdy) {
  const m = String(mdy).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, day, year] = m;
  return `${year}-${mo.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
