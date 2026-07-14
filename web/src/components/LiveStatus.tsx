"use client";

interface LiveStatusProps {
  updatedAt: string | null;
  live: boolean;
}

export function LiveStatus({ updatedAt, live }: LiveStatusProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 pb-2 text-xs sm:px-8">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          live ? "bg-forest-bright animate-pulse" : "bg-ink/30"
        }`}
        aria-hidden
      />
      <span className="font-semibold uppercase tracking-[0.18em] text-ink/50">
        {live ? "Live feed" : "Cached"}
      </span>
      {updatedAt ? (
        <span className="text-ink/45">
          Updated {new Date(updatedAt).toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
