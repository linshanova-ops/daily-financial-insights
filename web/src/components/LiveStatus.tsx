"use client";

import { L } from "./L";

interface LiveStatusProps {
  updatedAt: string | null;
  live: boolean;
}

export function LiveStatus({ updatedAt, live }: LiveStatusProps) {
  return (
    <div className="flex items-center gap-3 pb-2 text-xs">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          live ? "bg-forest-bright animate-pulse" : "bg-ink/30"
        }`}
        aria-hidden
      />
      <span className="font-semibold uppercase tracking-[0.18em] text-ink/50">
        {live ? <L en="Live feed" zh="实时" /> : <L en="Static copy" zh="静态" />}
      </span>
      {updatedAt ? (
        <span className="text-ink/45">
          <L
            en={`Updated ${new Date(updatedAt).toLocaleString("en-US")}`}
            zh={`更新于 ${new Date(updatedAt).toLocaleString("zh-CN")}`}
          />
        </span>
      ) : null}
    </div>
  );
}
