/**
 * Theme card shape: one force, Cite: facts the So what uses, judgment a
 * reader can act on until this card's dated settle. Fails unused fact
 * numbers, Yahoo quote as the force, cloned House (date) desk views,
 * undated last sentence, sourcing caveats as so-what, every card STRONG.
 * Fact numbers themselves are evidence-checked against chip pages by
 * scan-source-links.
 */
// ponytail: same sentence split as ThemeCards.tsx; "a.m. EDT" style clocks miscount, drop the clock.
const sentences = (text) =>
  String(text || "")
    .trim()
    .split(/(?<!U\.S)(?<!U\.K)(?<=[.。])\s+/)
    .filter(Boolean);

// ponytail: bans the observed "X is not Y" / inject meta voice; widen when a new tic shows up.
const META =
  /,\s*not (a|an|the|this|that|today|yesterday|Monday|Tuesday|Wednesday|Thursday|Friday)\b|\bis not\b|\binject\b|\b(this|other) card\b/i;

const DESK_VIEW = /\(\d{1,2} [A-Z][a-z]+\)[:：] /;
// ponytail: Title Case / CICC-style names; add J.P. Morgan if a dotted house shows up.
const DESK_KEY =
  /((?:[A-Z][A-Za-z'-]*(?: (?:of|[A-Z][A-Za-z'-]*)){0,3})|[\u4e00-\u9fff]{1,12})\s*\((\d{1,2} [A-Z][a-z]+)\)[:：] /g;
const YAHOO_QUOTE = /finance\.yahoo\.com\/quote/i;
const NUMBER = /\d[\d,]*\.\d+%?|\d+%|\d{1,3}(?:,\d{3})+|\b\d{4,}\b/g;

function splitCite(line) {
  const ascii = line.indexOf(": ");
  const wide = line.indexOf("：");
  let cut = -1;
  let sep = 0;
  if (ascii > 0 && ascii <= 48) {
    cut = ascii;
    sep = 2;
  }
  if (wide > 0 && wide <= 48 && (cut < 0 || wide < cut)) {
    cut = wide;
    sep = 1;
  }
  if (cut < 0) return null;
  const head = line.slice(0, cut);
  if (/^\d{1,2}$/.test(head)) return null;
  return { head, rest: line.slice(cut + sep) };
}

function numbers(text) {
  const out = new Set();
  for (const raw of String(text || "").match(NUMBER) || []) {
    const n = raw.replace(/[,%]/g, "");
    if (n.length < 3) continue;
    if (/^(19|20)\d{2}$/.test(n)) continue;
    out.add(n);
  }
  return out;
}

export function checkThemeCards(briefing) {
  const cards = Array.isArray(briefing.themeCards) ? briefing.themeCards : [];
  const problems = [];
  const seen = new Map();
  const desks = new Map();
  for (const c of cards) {
    const id = c?.id || "?";
    const factLines = sentences(c?.fact);
    const soLines = sentences(c?.mechanism);
    const chips = Array.isArray(c?.factSources) ? c.factSources.length : 0;
    if (factLines.length < 2 || factLines.length > 4) {
      problems.push(`${id}: fact has ${factLines.length} sentences (2–4)`);
    }
    if (soLines.length < 2 || soLines.length > 4) {
      problems.push(`${id}: so-what has ${soLines.length} sentences (2–4)`);
    }
    if (chips < 1 || chips > 4) problems.push(`${id}: ${chips} factSources (1–4)`);
    for (const line of factLines) {
      if (!splitCite(line)) {
        problems.push(
          `${id}: fact line is not \`Cite: statement\`: "${line.slice(0, 72)}"`,
        );
      }
    }
    const m = META.exec(String(c?.mechanism || ""));
    if (m) problems.push(`${id}: so-what is a sourcing caveat, not judgment: "${m[0]}"`);
    const blob = [
      c?.fact,
      c?.mechanism,
      ...(c?.factSources || []).map((s) => s?.href),
    ]
      .map(String)
      .join("\n");
    if (YAHOO_QUOTE.test(blob)) {
      problems.push(
        `${id}: Yahoo quote HTML is not a theme; inject levels stay in marketDashboard`,
      );
    }
    const factNums = numbers(c?.fact);
    const soNums = numbers(c?.mechanism);
    for (const n of factNums) {
      const prev = seen.get(n);
      if (prev && prev !== id) problems.push(`${id}: ${n} already printed on ${prev}`);
      else seen.set(n, id);
    }
    for (const n of soNums) {
      if (!factNums.has(n)) {
        problems.push(`${id}: so-what cites ${n} that is not in this card's fact`);
      }
    }
    for (const line of factLines) {
      const ns = numbers(line);
      if (ns.size && ![...ns].some((n) => soNums.has(n))) {
        problems.push(
          `${id}: fact number ${[...ns].join(", ")} is unused in So what`,
        );
      }
    }
    const last = soLines[soLines.length - 1] || "";
    if (soLines.length && !/\d/.test(last)) {
      problems.push(
        `${id}: last so-what sentence must be the dated settle for this card`,
      );
    }
    if (soLines.length && DESK_VIEW.test(last)) {
      problems.push(
        `${id}: last so-what is a desk view; the dated settle is the last sentence`,
      );
    }
    DESK_KEY.lastIndex = 0;
    const keys = [];
    let d;
    const mech = String(c?.mechanism || "");
    while ((d = DESK_KEY.exec(mech))) {
      keys.push(`${d[1].trim()} (${d[2]})`);
    }
    if (keys.length > 1) {
      problems.push(`${id}: ${keys.length} desk views (at most one)`);
    }
    for (const k of keys) {
      const prev = desks.get(k);
      if (prev) problems.push(`${id}: cloned desk view ${k} already on ${prev}`);
      else desks.set(k, id);
    }
  }
  if (cards.length >= 3 && new Set(cards.map((c) => c?.grade)).size === 1) {
    problems.push(`all ${cards.length} cards are ${cards[0].grade}; grade the tape`);
  }
  // ponytail: presence only — `House (4 September): …` somewhere; the filter itself is judgment in the skill.
  if (cards.length && !cards.some((c) => DESK_VIEW.test(String(c?.mechanism || "")))) {
    problems.push(
      "no card carries a dated desk view (`House (d Month): …`); CICC / house views were skipped",
    );
  }
  return problems.length ? { ok: false, message: problems.join("\n  ") } : { ok: true };
}
