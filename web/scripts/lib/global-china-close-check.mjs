/**
 * Global / China What-changed bullets are for desk news, not a second Market closes table.
 */
const CLOSE_SOURCE =
  /Seattle Times AP|Boston 25 AP|U\.S\. Treasury curve|Kiplinger Monday close|Cointelegraph Monday bitcoin|^同花顺 A股$|智通财经 Hang Seng/;

function bulletUsesCloseSource(bullet) {
  for (const s of bullet?.sources || []) {
    if (CLOSE_SOURCE.test(String(s?.label || ""))) return s.label;
  }
  return null;
}

export function checkGlobalChinaNoCloseDup(briefing) {
  const problems = [];
  for (const [field, bullets] of [
    ["globalChanged", briefing.globalChanged],
    ["chinaChanged", briefing.chinaChanged],
  ]) {
    for (const b of bullets || []) {
      const label = bulletUsesCloseSource(b);
      if (label) {
        problems.push(
          `${field}: close print "${label}" belongs in marketDashboard, not What changed`,
        );
      }
    }
  }
  return problems.length ? { ok: false, message: problems.join("\n  ") } : { ok: true };
}
