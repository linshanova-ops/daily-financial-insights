import { dropRestatedScale } from "../../scripts/lib/scale-paren.mjs";

/**
 * Book-spine label: the tone's first clause, capped at 10 字 / 26 chars.
 * ponytail: first clause only, a curated `spine` field per briefing reads better.
 */
export function spineTitle(tone: string, lang: "en" | "zh" = "en"): string {
  const text = dropRestatedScale(tone)
    .replace(/\s*[(（][^)）]*[)）]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const clause = text.split(lang === "zh" ? /[，。；：]/ : /[,;:—]\s?|\.(?:\s|$)/)[0].trim();
  const max = lang === "zh" ? 10 : 26;
  if (clause.length <= max) return clause;
  if (lang === "zh") return `${clause.slice(0, max - 1)}…`;
  return `${clause.slice(0, max + 1).replace(/\s+\S*$/, "")}…`;
}
