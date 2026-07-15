import type { FactSource, SourcedFact } from "./types";

/** Normalize legacy string bullets and new { text, sources } facts. */
export function asSourcedFacts(
  items: Array<string | SourcedFact> | undefined | null,
): SourcedFact[] {
  if (!items?.length) return [];
  return items.map((item) =>
    typeof item === "string" ? { text: item } : { text: item.text, sources: item.sources },
  );
}

export function factKey(fact: SourcedFact, index: number): string {
  return `${index}-${fact.text.slice(0, 48)}`;
}

export function primarySource(fact: SourcedFact): FactSource | undefined {
  return fact.sources?.[0];
}
