/**
 * Latest briefing only. Older files stay one language.
 * ponytail: rendered sentences must be { en, zh } in the YAML the weekday publish writes.
 */
const NAMES = ["华尔街见闻", "第一财经", "财经早茶", "今日图表", "财新", "律动", "见闻", "彭博"];

function significant(s) {
  return s.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{3,}/g) || [];
}

function strayCjk(s) {
  let t = s;
  for (const n of NAMES) t = t.split(n).join("");
  t = t.replace(/\d+亿美元/g, "").replace(/\d+亿元/g, "");
  return (t.match(/[\u4e00-\u9fff]/g) || []).length;
}

function visit(value, where, problems) {
  if (typeof value === "string") {
    problems.push(`${where}: sentence is one language`);
    return;
  }
  if (!value || typeof value.en !== "string" || typeof value.zh !== "string") {
    problems.push(`${where}: need { en, zh }`);
    return;
  }
  if (/^\s*[\u4e00-\u9fff]/.test(value.en)) {
    problems.push(`${where}: English sentence starts with Chinese`);
  }
  if (strayCjk(value.en)) problems.push(`${where}: English side still has Chinese`);
  if (!/[\u4e00-\u9fff]/.test(value.zh)) problems.push(`${where}: Chinese side has no Chinese`);
  if (/Platts|普氏/.test(value.en + value.zh)) problems.push(`${where}: Platts`);
  for (const n of significant(value.en)) {
    if (!value.zh.includes(n)) problems.push(`${where}: ${n} missing in zh`);
  }
  for (const n of significant(value.zh)) {
    if (!value.en.includes(n)) problems.push(`${where}: ${n} missing in en`);
  }
}

export function checkBilingual(briefing) {
  const problems = [];
  const one = (value, where) => {
    if (value) visit(value, where, problems);
  };
  const many = (arr, where, field) => {
    (arr || []).forEach((item, i) => one(item?.[field], `${where}[${i}].${field}`));
  };

  one(briefing.title, "title");
  one(briefing.coverageWindow, "coverageWindow");
  one(briefing.marketTone, "marketTone");
  one(briefing.signal, "signal");
  one(briefing.watch, "watch");
  one(briefing.sources, "sources");
  one(briefing.singleSource, "singleSource");
  one(briefing.globalRegime, "globalRegime");
  one(briefing.globalTensions, "globalTensions");
  one(briefing.chinaStance, "chinaStance");
  one(briefing.chinaDivergences, "chinaDivergences");
  many(briefing.summary, "summary", "text");
  many(briefing.globalChanged, "globalChanged", "text");
  many(briefing.globalImplies, "globalImplies", "text");
  many(briefing.chinaChanged, "chinaChanged", "text");
  many(briefing.chinaImplies, "chinaImplies", "text");
  many(briefing.figures, "figures", "title");
  many(briefing.figures, "figures", "analysis");
  one(briefing.marketOverview?.note, "marketOverview.note");
  many(briefing.marketOverview?.items, "marketOverview", "label");
  many(briefing.marketOverview?.items, "marketOverview", "text");
  one(briefing.marketDashboard?.note, "marketDashboard.note");
  one(briefing.eventCalendar?.note, "eventCalendar.note");
  many(briefing.eventCalendar?.events, "event", "event");
  many(briefing.keySources, "keySources", "influence");
  (briefing.themeCards || []).forEach((card, i) => {
    const w = `themeCards[${i}]`;
    one(card.title, `${w}.title`);
    one(card.fact, `${w}.fact`);
    one(card.mechanism, `${w}.mechanism`);
    one(card.trigger, `${w}.trigger`);
    one(card.invalidator, `${w}.invalidator`);
    one(card.horizon, `${w}.horizon`);
    (card.assets || []).forEach((a, j) => one(a, `${w}.assets[${j}]`));
  });

  const brent = (briefing.marketDashboard?.groups || [])
    .flatMap((g) => g.rows || [])
    .find((r) => r.id === "brent" || r.asset === "Brent futures (Yahoo)");
  if (brent && brent.asset !== "Brent futures (Yahoo)") {
    problems.push("brent row was relabeled");
  }
  const note = briefing.marketDashboard?.note;
  const noteZh = typeof note === "string" ? note : note?.zh || "";
  if (note && !String(noteZh).includes("BZ=F") && !(typeof note === "object" && note.en?.includes("BZ=F"))) {
    problems.push("dashboard note lost Yahoo BZ=F");
  }

  return problems.length ? { ok: false, message: problems.join("\n  ") } : { ok: true };
}
