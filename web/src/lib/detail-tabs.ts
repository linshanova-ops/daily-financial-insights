// web/src/lib/detail-tabs.ts
export type DetailTabId =
  | "global"
  | "china"
  | "assets"
  | "signals"
  | "watch"
  | "sources";

export const DETAIL_TABS: ReadonlyArray<{
  id: DetailTabId;
  label: string;
  hashes: readonly string[];
}> = [
  { id: "global", label: "Global", hashes: ["global-situation", "detail"] },
  { id: "china", label: "China", hashes: ["china-situation"] },
  { id: "assets", label: "Assets", hashes: ["asset-framework"] },
  { id: "signals", label: "Signals", hashes: ["signals"] },
  { id: "watch", label: "Watch", hashes: ["watch"] },
  { id: "sources", label: "Sources", hashes: ["sources"] },
];

const HASH_TO_TAB: Record<string, DetailTabId> = Object.fromEntries(
  DETAIL_TABS.flatMap((tab) => tab.hashes.map((h) => [h, tab.id])),
) as Record<string, DetailTabId>;

/** Map location.hash or bare id to a Detail tab. Unknown → global. */
export function detailTabFromHash(hash: string): DetailTabId {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return "global";
  return HASH_TO_TAB[id] ?? "global";
}
