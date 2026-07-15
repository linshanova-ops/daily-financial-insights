"use client";

import type { RefreshPhase } from "@/lib/request-refresh";

interface LiveStatusProps {
  updatedAt: string | null;
  live: boolean;
  phase?: RefreshPhase;
}

export function LiveStatus({ updatedAt, live, phase = "idle" }: LiveStatusProps) {
  const generating = phase === "requesting" || phase === "generating";
  const label = generating
    ? "Updating…"
    : live
      ? "Live feed"
      : "Cached";

  return (
    <div className="flex items-center gap-3 pb-2 text-xs">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          generating
            ? "bg-copper animate-pulse"
            : live
              ? "bg-forest-bright animate-pulse"
              : "bg-ink/30"
        }`}
        aria-hidden
      />
      <span className="font-semibold uppercase tracking-[0.18em] text-ink/50">
        {label}
      </span>
      {updatedAt ? (
        <span className="text-ink/45">
          Updated {new Date(updatedAt).toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
