export type DetailTabId = "global" | "china" | "assets" | "sources";

/** Detail accordion tabs — Signals / Calendar are first-class skim sections. */
export const DETAIL_TABS: ReadonlyArray<{
  id: DetailTabId;
  label: string;
  hashes: readonly string[];
}> = [
  { id: "global", label: "Global", hashes: ["global-situation"] },
  { id: "china", label: "China", hashes: ["china-situation"] },
  { id: "assets", label: "Assets", hashes: ["asset-framework"] },
  { id: "sources", label: "Sources", hashes: ["sources", "sources-caveats"] },
];

const HASH_TO_TAB: Record<string, DetailTabId> = Object.fromEntries(
  DETAIL_TABS.flatMap((tab) => tab.hashes.map((h) => [h, tab.id])),
) as Record<string, DetailTabId>;

function hashId(hash: string): string {
  return hash.replace(/^#/, "").trim();
}

/** True when hash (after stripping `#`) matches a known detail tab alias. */
export function isKnownDetailHash(hash: string): boolean {
  const id = hashId(hash);
  return id === "detail" || (id !== "" && id in HASH_TO_TAB);
}

/** Map location.hash or bare id to a Detail tab. Unknown / #detail → global. */
export function detailTabFromHash(hash: string): DetailTabId {
  const id = hashId(hash);
  if (!id || id === "detail") return "global";
  return HASH_TO_TAB[id] ?? "global";
}
