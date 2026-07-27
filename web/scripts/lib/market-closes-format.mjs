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
 */
export function withYahooMetaFallback(pairs, meta = {}) {
  const out = [...pairs];
  const price = Number(meta.regularMarketPrice);
  const time = Number(meta.regularMarketTime);
  if (!Number.isFinite(price) || !Number.isFinite(time)) return out;
  const last = out[out.length - 1];
  if (!last || unixToDateString(time) > unixToDateString(last.t)) {
    out.push({ t: time, c: price });
  }
  return out;
}

/** Parse MM/DD/YYYY treasury CSV date → YYYY-MM-DD */
export function parseUsDate(mdy) {
  const m = String(mdy).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, day, year] = m;
  return `${year}-${mo.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
