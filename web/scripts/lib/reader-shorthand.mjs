/**
 * Reader pages drop agent shorthand. A field that is only that shorthand
 * becomes the early-test line. Facts that remain in the sentence stay.
 * ponytail: pattern list, not a rewrite of each old day.
 */
const EARLY_EN = "Early test. Summary omitted.";
const EARLY_ZH = "早期测试期，摘要从略。";

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

export function readerLine(text) {
  const raw = String(text ?? "");
  const stripped = stripInternalShorthand(raw);
  if (/\bCLAIM\b|Iran-CLAIM/.test(raw) && !stripped.replace(/[\s.。;；]/g, "")) {
    return /[\u4e00-\u9fff]/.test(raw) ? EARLY_ZH : EARLY_EN;
  }
  return stripped;
}
