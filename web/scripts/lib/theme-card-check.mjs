/**
 * Theme card shape: one force, a short fact, a so-what that is judgment.
 * Fails the dump pattern: 10-print facts, sourcing caveats as so-what,
 * every card STRONG, the same close restated on two cards, a so-what number
 * the fact never printed, Yahoo quote HTML as a chip. Fact numbers themselves
 * are evidence-checked against chip pages by scan-source-links.
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

const NUMBER = /\d[\d,]*\.\d+%?|\d+%|\d{1,3}(?:,\d{3})+/g;

const DESK_VIEW = /\(\d{1,2} [A-Z][a-z]+\)[:：] /;

export function checkThemeCards(briefing) {
  const cards = Array.isArray(briefing.themeCards) ? briefing.themeCards : [];
  const problems = [];
  const seen = new Map();
  for (const c of cards) {
    const id = c?.id || "?";
    const factN = sentences(c?.fact).length;
    const soN = sentences(c?.mechanism).length;
    const chips = Array.isArray(c?.factSources) ? c.factSources.length : 0;
    if (factN < 1 || factN > 5) problems.push(`${id}: fact has ${factN} sentences (1–5)`);
    if (soN < 1 || soN > 4) problems.push(`${id}: so-what has ${soN} sentences (1–4)`);
    if (chips < 1 || chips > 4) problems.push(`${id}: ${chips} factSources (1–4)`);
    const m = META.exec(String(c?.mechanism || ""));
    if (m) problems.push(`${id}: so-what is a sourcing caveat, not judgment: "${m[0]}"`);
    for (const s of c?.factSources || []) {
      if (/finance\.yahoo\.com\/quote/.test(String(s?.href || ""))) {
        problems.push(`${id}: Yahoo quote HTML is not a print; inject levels stay in marketDashboard`);
      }
    }
    const factNums = new Set();
    for (const raw of String(c?.fact || "").match(NUMBER) || []) {
      const n = raw.replace(/[,%]/g, "");
      if (n.length < 3) continue;
      factNums.add(n);
      const prev = seen.get(n);
      if (prev && prev !== id) problems.push(`${id}: ${raw} already printed on ${prev}`);
      else seen.set(n, id);
    }
    for (const raw of String(c?.mechanism || "").match(NUMBER) || []) {
      const n = raw.replace(/[,%]/g, "");
      if (n.length >= 3 && !factNums.has(n)) {
        problems.push(`${id}: so-what cites ${raw} that is not in this card's fact`);
      }
    }
  }
  if (cards.length >= 3 && new Set(cards.map((c) => c?.grade)).size === 1) {
    problems.push(`all ${cards.length} cards are ${cards[0].grade}; grade the tape`);
  }
  // ponytail: presence only — `House (4 September): …` somewhere; the filter itself is judgment in the skill.
  if (cards.length && !cards.some((c) => DESK_VIEW.test(String(c?.mechanism || "")))) {
    problems.push("no card carries a dated desk view (`House (d Month): …`); CICC / house views were skipped");
  }
  return problems.length ? { ok: false, message: problems.join("\n  ") } : { ok: true };
}
