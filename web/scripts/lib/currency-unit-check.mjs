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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Verify `CNY Xbn` against either English bn or equivalent Chinese 亿 text. */
export function pageHasCnyBnEvidence(pageText, bnAmount) {
  const text = String(pageText || "").replace(/,/g, "");
  const bn = Number(bnAmount);
  if (!Number.isFinite(bn)) return false;
  const yi = String(Number((bn * 10).toFixed(10)));
  const bnRe = new RegExp(
    `(?:CNY|RMB|￥)?\\s*${escapeRegex(bnAmount)}\\s*(?:bn|billion)\\b`,
    "i",
  );
  // Allow 666.07亿元 to evidence CNY66.6bn / CNY66.607bn (same integer 亿 stem).
  const yiRe = new RegExp(
    `${escapeRegex(yi)}(?:\\.\\d+)?\\s*亿(?:元)?`,
    "i",
  );
  return bnRe.test(text) || yiRe.test(text);
}
