"use client";

import { formatPublishedAt } from "@/lib/format-published";
import { L } from "./L";

interface LiveStatusProps {
  snapshotAt: string | null;
}

/** The feed check is not a live price. The market note still says the page is not a live quote. */
export function LiveStatus({ snapshotAt }: LiveStatusProps) {
  const en = snapshotAt ? formatPublishedAt(snapshotAt) : null;
  const zh = snapshotAt ? formatPublishedAt(snapshotAt, "zh") : null;
  return (
    <p className="pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
      <L
        en={en ? `Content checked. Snapshot ${en}.` : "Content checked."}
        zh={zh ? `内容已核对。快照 ${zh}。` : "内容已核对。"}
      />
    </p>
  );
}
