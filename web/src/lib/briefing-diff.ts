import type { Briefing, FactLine } from "./types";
import { asSourcedFacts } from "./sourced-facts";

export interface BriefingChange {
  kind: "tone" | "signal" | "watch" | "summary" | "print";
  text: string;
}

function factTexts(items: FactLine[] | undefined): string[] {
  return asSourcedFacts(items).map((item) => item.text);
}

/**
 * Lightweight "what changed since last briefing" for readers.
 * Compares high-signal fields only — not a full text diff.
 */
export function diffBriefings(
  current: Briefing,
  previous: Briefing | null | undefined,
): BriefingChange[] {
  if (!previous) {
    return [
      {
        kind: "tone",
        text: "First briefing in the archive — no prior day to compare.",
      },
    ];
  }

  const changes: BriefingChange[] = [];

  if (current.marketTone !== previous.marketTone) {
    changes.push({
      kind: "tone",
      text: `Market tone updated: ${current.marketTone}`,
    });
  }

  const prevSignals = new Set(previous.signals.map((s) => s.name));
  const currSignals = new Set(current.signals.map((s) => s.name));
  for (const name of currSignals) {
    if (!prevSignals.has(name)) {
      changes.push({ kind: "signal", text: `New signal: ${name}` });
    }
  }
  for (const name of prevSignals) {
    if (!currSignals.has(name)) {
      changes.push({ kind: "signal", text: `Signal retired: ${name}` });
    }
  }

  const prevWatch = new Set(previous.watchItems.map((w) => w.headline));
  const currWatch = new Set(current.watchItems.map((w) => w.headline));
  for (const headline of currWatch) {
    if (!prevWatch.has(headline)) {
      changes.push({ kind: "watch", text: `New watch: ${headline}` });
    }
  }

  const prevSummary = new Set(factTexts(previous.summary));
  for (const line of factTexts(current.summary)) {
    if (!prevSummary.has(line)) {
      changes.push({ kind: "summary", text: line });
    }
  }

  const prevPrints = new Set([
    ...factTexts(previous.globalChanged),
    ...factTexts(previous.chinaChanged),
  ]);
  let printAdds = 0;
  for (const line of [
    ...factTexts(current.globalChanged),
    ...factTexts(current.chinaChanged),
  ]) {
    if (prevPrints.has(line)) continue;
    changes.push({ kind: "print", text: line });
    printAdds += 1;
    if (printAdds >= 4) break;
  }

  if (changes.length === 0) {
    changes.push({
      kind: "tone",
      text: "No material headline changes vs the prior briefing.",
    });
  }

  return changes;
}
