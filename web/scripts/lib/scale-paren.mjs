/**
 * Drop a parenthetical that only restates the same amount in the other scale.
 * English keeps million/billion. Chinese keeps 万/亿. One guard for title and prose.
 * ponytail: ×100 and ×10 only. A paren that is not that multiple stays.
 */

const NUM = String.raw`\d+(?:\.\d+)?`;

function closeEnough(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
}

function sameScale(n, paren, kind) {
  const x = Number(n);
  const y = Number(paren);
  if (kind === "million" || kind === "万") {
    return closeEnough(x * 100, y) || closeEnough(x / 100, y);
  }
  return (
    closeEnough(x * 10, y) ||
    closeEnough(x / 10, y) ||
    closeEnough(x * 100, y) ||
    closeEnough(x / 100, y)
  );
}

function fmt(n) {
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 1e6) / 1e6);
}

function esc(n) {
  return String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function dropRestatedScale(text) {
  if (!text) return text || "";
  let out = String(text).replace(
    new RegExp(
      `(${NUM})\\s+(million|billion)(\\s+dollars?|\\s+yuan)?(?:\\s+([A-Za-z]+))?\\s+\\((${NUM})\\)`,
      "g",
    ),
    (full, n, unit, extra, gap, paren) => {
      if (!sameScale(n, paren, unit)) return full;
      const tail = (extra || "").replace(/\s+/g, " ");
      return `${n} ${unit}${tail}${gap ? ` ${gap}` : ""}`;
    },
  );
  out = out.replace(
    new RegExp(`(${NUM})(万|亿)(美元|元)?（(${NUM})）`, "g"),
    (full, n, unit, extra, paren) => {
      if (!sameScale(n, paren, unit)) return full;
      return `${n}${unit}${extra || ""}`;
    },
  );
  out = out.replace(
    new RegExp(`(${NUM})(\\s*)亿元（CNY(${NUM})bn）`, "g"),
    (full, n, space, cny) => (sameScale(n, cny, "亿") ? `${n}${space}亿元` : full),
  );
  return out;
}

function hasToken(text, n) {
  return new RegExp(`(?<!\\d)${esc(n)}(?!\\d)`).test(text);
}

/** True when `other` already states `n`, or the 万/亿 ↔ million/billion twin. */
export function otherHasSameAmount(n, other) {
  if (hasToken(other, n)) return true;
  const x = Number(String(n).replace(/,/g, ""));
  if (!Number.isFinite(x)) return false;
  const pairs = [
    [x * 100, "万"],
    [x * 10, "亿"],
    [x / 100, "million"],
    [x / 10, "billion"],
    [x * 100, "million"],
    [x / 100, "亿"],
  ];
  for (const [v, unit] of pairs) {
    const s = fmt(v);
    if (!s || s === "0") continue;
    const num = esc(s);
    const re =
      unit === "万" || unit === "亿"
        ? new RegExp(`(?<!\\d)${num}(?!\\d)\\s*${unit}`)
        : new RegExp(`(?<!\\d)${num}(?!\\d)\\s+${unit}`);
    if (re.test(other)) return true;
  }
  return false;
}
