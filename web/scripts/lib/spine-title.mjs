import { dropRestatedScale } from "./scale-paren.mjs";

const CUT = {
  zh: /[，。；：]/,
  en: /[,;:]\s*(?:and\s+)?|\s+—\s+|\.(?:\s+|$)|\s+(?:as|while|after|and)\s+/,
};
const LEAD = /^(周[一二三四五六日]|图上|图表显示|On the chart)$/;

/**
 * Book-spine label for a briefing with no curated `spine`: up to two short
 * clauses of the tone, ≤10 字 / 26 chars.
 * ponytail: clause packing, a curated `spine` in frontmatter always wins.
 */
export function spineTitle(tone, lang = "en") {
  const max = lang === "zh" ? 10 : 26;
  const parts = dropRestatedScale(tone)
    .replace(/\s*[(（][^)）]*[)）]/g, "")
    .replace(lang === "zh" ? /价格|期货/g : /\s+(?:prices|futures)\b/g, "")
    .split(CUT[lang])
    .map((part) => part.trim())
    .filter((part) => part && !LEAD.test(part));
  const picked = [];
  for (const part of parts) {
    const next = [...picked, part].join(lang === "zh" ? "与" : ", ");
    if (next.length <= max) picked.push(part);
    if (picked.length === 2) break;
  }
  if (picked.length) return picked.join(lang === "zh" ? "与" : ", ");
  const first = parts[0] ?? "";
  return lang === "zh"
    ? `${first.slice(0, max - 1)}…`
    : `${first.slice(0, max + 1).replace(/\s+\S*$/, "")}…`;
}

const TOPICS = {
  oil: /\b(oil|brent|wti|crude|hormuz|iran|saudi|gulf|kharg|tankers?)\b/i,
  gold: /\bgold\b/i,
  chips: /\b(chips?|nvidia|tsmc|amd|ai|tech|nasdaq|sox|kimi|intel|mag 7|alphabet|tencent|salesforce)\b/i,
  rates: /\b(cpi|ppi|pce|fed|yields?|treasury|\d+-year|2y|curve|payrolls|jobs|claims|inflation|gdp|ecb|boj|hikes?|buybacks?|tga|waller)\b/i,
  fx: /\b(yen|dollar|real)\b/i,
  china: /\b(china|a-shares|shanghai|chinext|hang seng|kospi|asia|us-china)\b/i,
};

/** Background picture for a spine: the topic named earliest in its English title. */
export function spineTopic(title) {
  let best = "stocks";
  let at = Infinity;
  for (const [topic, re] of Object.entries(TOPICS)) {
    const i = title.search(re);
    if (i >= 0 && i < at) [best, at] = [topic, i];
  }
  return best;
}
