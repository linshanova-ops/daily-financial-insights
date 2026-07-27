function normalizeAmount(value) {
  return String(value).replace(/\s+/g, "").replace(/[—-]/g, "–");
}

/**
 * Find likely 10× mistakes where an `亿元` numeral was copied verbatim and
 * relabeled as `bn`. Correct conversion: 10亿元 = CNY1bn.
 */
export function findBnYiMismatches(text) {
  const raw = String(text || "");
  const amountPattern =
    String.raw`\d+(?:\.\d+)?(?:\s*[–—-]\s*\d+(?:\.\d+)?)?`;
  const yi = new Set(
    [...raw.matchAll(new RegExp(`(${amountPattern})\\s*亿元`, "g"))].map((m) =>
      normalizeAmount(m[1]),
    ),
  );
  const issues = [];
  const bnRe = new RegExp(
    `(?:(?:CNY|RMB)\\s*)?(${amountPattern})\\s*bn\\b`,
    "gi",
  );
  for (const match of raw.matchAll(bnRe)) {
    if (raw[match.index - 1] === "$") continue;
    const amount = normalizeAmount(match[1]);
    if (yi.has(amount)) {
      issues.push({ amount, claim: match[0], index: match.index });
    }
  }
  return issues;
}

export function yiToBn(amount) {
  return normalizeAmount(amount)
    .split("–")
    .map((part) => String(Number(part) / 10))
    .join("–");
}
