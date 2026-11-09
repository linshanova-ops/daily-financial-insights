/**
 * Reader pages drop agent shorthand. A field that is only that shorthand
 * becomes the early-test line. Facts that remain in the sentence stay.
 * ponytail: pattern list, not a rewrite of each old day.
 */
const EARLY_EN = "Early test. Summary omitted.";
const EARLY_ZH = "早期测试期，摘要从略。";

/**
 * Desk names and chip tails already used in English on the site.
 * Longest key first so 见闻 does not eat 华尔街见闻 and a dated tail
 * does not eat a shorter one.
 * ponytail: static pairs, add a row when a new Chinese chip shows on the English page.
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
  ["11月6日 选举与配置", "Nov 6 election allocation"],
  ["11月5日 选举与油价", "Nov 5 election and oil"],
  ["11月4日 稳汇率", "Nov 4 yuan"],
  ["买断式逆回购结果", "outright reverse repo result"],
  ["11月6日早餐", "Nov 6 breakfast"],
  ["11月6日早报", "Nov 6 morning brief"],
  ["11月5日早知道", "Nov 5 morning brief"],
  ["11月5日早餐", "Nov 5 breakfast"],
  ["比特币跌破76000", "bitcoin under 76000"],
  ["美光暂停台厂", "Micron Taiwan plant"],
  ["金融工作报告", "financial work report"],
  ["11月6日重点", "Nov 6 calendar"],
  ["韩股熔断", "Kospi circuit breaker"],
  ["亚太早盘", "Asia morning"],
  ["买断式逆回购", "outright reverse repo"],
  ["日韩收盘", "Nikkei/Kospi closes"],
  ["本周日程", "Week calendar"],
  ["日经收盘", "Nikkei close"],
  ["美股收盘", "US close"],
  ["港股收盘", "Hong Kong close"],
  ["原油收盘", "oil settle"],
  ["Meta欧元债", "Meta euro bond"],
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

const AMT = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;

function amount(s) {
  return Number(String(s).replace(/,/g, ""));
}

function trim(n) {
  return String(Math.round(n * 1e6) / 1e6);
}

/** Largest unit a reader would say. 1万 = 10 thousand, 1亿 = 100 million, 1万亿 = 1 trillion. */
function enCount(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const scales = [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  for (const [div, name] of scales) {
    if (abs + 1e-8 >= div) return `${sign}${trim(abs / div)} ${name}`;
  }
  return `${sign}${trim(abs)}`;
}

function zhCount(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs + 1e-8 >= 1e12) return `${sign}${trim(abs / 1e12)}万亿`;
  if (abs + 1e-8 >= 1e8) return `${sign}${trim(abs / 1e8)}亿`;
  if (abs + 1e-8 >= 1e4) return `${sign}${trim(abs / 1e4)}万`;
  if (abs + 1e-8 >= 1e3) return `${sign}${trim(abs / 1e3)}千`;
  if (abs + 1e-8 >= 100) return `${sign}${trim(abs / 100)}百`;
  return `${sign}${trim(abs)}`;
}

const ZH_CCY = {
  美元: " dollars",
  欧元: " euros",
  英镑: " pounds",
  盎司: " ounces",
  元: " yuan",
  人: " people",
};

const EN_CCY = {
  dollars: "美元",
  dollar: "美元",
  yuan: "元",
  ounces: "盎司",
  ounce: "盎司",
  euros: "欧元",
  euro: "欧元",
  pounds: "英镑",
  pound: "英镑",
};

function zhCcy(word) {
  return word ? EN_CCY[word.toLowerCase()] || "" : "";
}

/**
 * English: thousand, million, billion, trillion.
 * Chinese: 个, 百, 千, 万, 亿, on a scale a reader would say.
 * ponytail: a number glued to the unit. A scale named only later in the sentence stays.
 */
function unitsForLang(text, lang) {
  if (!text) return text || "";
  if (lang === "en") return toEnglishUnits(text);
  return toChineseUnits(text);
}

function toEnglishUnits(text) {
  let s = text;
  const zhTail = "(美元|欧元|英镑|盎司|元|人)?";
  s = s.replace(
    new RegExp(`(${AMT})\\s+after\\s+a\\s+prior\\s+(${AMT}),\\s+in\\s+units\\s+of\\s+ten\\s+thousand(?:\\s+([A-Za-z]+))?`, "gi"),
    (_, a, b, noun) =>
      `${enCount(amount(a) * 1e4)} after a prior ${enCount(amount(b) * 1e4)}${noun ? ` ${noun}` : ""}`,
  );
  s = s.replace(new RegExp(`(${AMT})\\s*(万亿|亿|万|千)${zhTail}`, "g"), (_, n, unit, suf) => {
    const mul = unit === "万亿" ? 1e12 : unit === "亿" ? 1e8 : unit === "万" ? 1e4 : 1e3;
    return `${enCount(amount(n) * mul)}${ZH_CCY[suf] || ""}`;
  });
  const enTail = "(?:\\s+(dollars?|yuan|ounces?|euros?|pounds?))?";
  s = s.replace(
    new RegExp(`(${AMT})\\s+hundred\\s+million${enTail}`, "gi"),
    (_, n, ccy) => `${enCount(amount(n) * 1e8)}${ccy ? ` ${ccy}` : ""}`,
  );
  s = s.replace(
    new RegExp(`(${AMT})\\s+in\\s+ten\\s+thousands?${enTail}`, "gi"),
    (_, n, ccy) => `${enCount(amount(n) * 1e4)}${ccy ? ` ${ccy}` : ""}`,
  );
  s = s.replace(
    new RegExp(`(${AMT})\\s+ten\\s+thousands?(?:\\s+([A-Za-z]+))?`, "gi"),
    (_, n, noun) => `${enCount(amount(n) * 1e4)}${noun ? ` ${noun}` : ""}`,
  );
  return s;
}

function toChineseUnits(text) {
  let s = text;
  s = s.replace(new RegExp(`(${AMT})\\s*千(?!亿)`, "g"), (full, n) => {
    const x = amount(n);
    return x >= 10 ? zhCount(x * 1e3) : full;
  });
  s = s.replace(new RegExp(`(${AMT})\\s*百万(美元|元|盎司|欧元|英镑|人)?`, "g"), (_, n, suf) => {
    return zhCount(amount(n) * 1e6) + (suf || "");
  });
  const ccy = "(?:\\s+(dollars?|yuan|ounces?|euros?|pounds?))?";
  const swap = (word, mul) => {
    s = s.replace(new RegExp(`(${AMT})\\s+${word}${ccy}`, "gi"), (_, n, tail) => {
      return zhCount(amount(n) * mul) + zhCcy(tail);
    });
  };
  s = s.replace(
    new RegExp(`(${AMT})\\s+hundred\\s+million${ccy}`, "gi"),
    (_, n, tail) => zhCount(amount(n) * 1e8) + zhCcy(tail),
  );
  s = s.replace(
    new RegExp(`(${AMT})\\s+(?:in\\s+)?ten\\s+thousands?${ccy}`, "gi"),
    (_, n, tail) => zhCount(amount(n) * 1e4) + zhCcy(tail),
  );
  swap("trillions?", 1e12);
  swap("billions?", 1e9);
  swap("millions?", 1e6);
  swap("thousands?", 1e3);
  return s;
}

export function readerLine(text, lang) {
  const raw = String(text ?? "");
  const stripped = stripInternalShorthand(raw);
  if (/\bCLAIM\b|Iran-CLAIM/.test(raw) && !stripped.replace(/[\s.。;；]/g, "")) {
    return /[\u4e00-\u9fff]/.test(raw) ? EARLY_ZH : EARLY_EN;
  }
  const line = lang === "en" ? englishSourceNames(stripped) : stripped;
  return unitsForLang(line, lang === "en" ? "en" : "zh");
}
