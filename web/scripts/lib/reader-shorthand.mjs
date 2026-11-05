/**
 * Reader pages drop agent shorthand. A field that is only that shorthand
 * becomes the early-test line. Facts that remain in the sentence stay.
 * ponytail: pattern list, not a rewrite of each old day.
 */
const EARLY_EN = "Early test. Summary omitted.";
const EARLY_ZH = "早期测试期，摘要从略。";

/**
 * Desk names already used on the site. Longest key first so 见闻 does not
 * eat 华尔街见闻 and 彭博财经早茶 keeps a space.
 * ponytail: static pairs, add a row when a new Chinese desk shows on the English page.
 */
const SOURCE_EN = [
  ["彭博 Markets Daily China / 财经早茶", "Bloomberg Markets Daily China"],
  ["彭博财经早茶", "Bloomberg Markets Daily China"],
  ["华尔街见闻", "Wallstreetcn"],
  ["第一财经", "Yicai"],
  ["财经早茶", "Markets Daily China"],
  ["今日图表", "Chart of the Day"],
  ["同花顺", "Tonghuashun"],
  ["共同社", "Kyodo"],
  ["新华社", "Xinhua"],
  ["财新", "Caixin"],
  ["律动", "BlockBeats"],
  ["见闻", "Wallstreetcn"],
  ["彭博", "Bloomberg"],
].sort((a, b) => b[0].length - a[0].length);

export function englishSourceNames(text) {
  let s = String(text ?? "");
  for (const [zh, en] of SOURCE_EN) s = s.split(zh).join(en);
  return s;
}

export function stripInternalShorthand(text) {
  if (!text) return "";
  const raw = String(text);
  let s = raw;
  s = s.replace(/Oil is Iran-CLAIM beta\s*[—–-]\s*/gi, "");
  s = s.replace(/Oil is Iran-CLAIM beta\.?\s*/gi, "");
  s = s.replace(/Oil is CLAIM\.?\s*/gi, "");
  s = s.replace(/[（(][^）)\n]{0,160}CLAIM[^）)\n]{0,80}[）)]/g, "");
  s = s.replace(/\bdesk\/CLAIM\b/gi, "");
  s = s.replace(/\bCLAIM\/desk\b/gi, "");
  s = s.replace(/\bIran-CLAIM\b/g, "");
  s = s.replace(/\bCLAIM\b/g, "");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/ *([,.;，。；])/g, "$1");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/（\s*）/g, "");
  s = s.replace(/^[\s;；,，.。—–-]+/, "");
  s = s.trim();
  if (/^[A-Z]/.test(raw.trim()) && /^[a-z]/.test(s)) {
    s = s[0].toUpperCase() + s.slice(1);
  }
  return s;
}

export function readerLine(text, lang) {
  const raw = String(text ?? "");
  const stripped = stripInternalShorthand(raw);
  if (/\bCLAIM\b|Iran-CLAIM/.test(raw) && !stripped.replace(/[\s.。;；]/g, "")) {
    return /[\u4e00-\u9fff]/.test(raw) ? EARLY_ZH : EARLY_EN;
  }
  return lang === "en" ? englishSourceNames(stripped) : stripped;
}
