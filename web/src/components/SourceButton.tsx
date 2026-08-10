import type { FactSource } from "@/lib/types";

interface SourceButtonProps {
  sources?: FactSource[] | null;
  /** When true, mark single-source rows (credibility signal). */
  markSingle?: boolean;
}

/** Compact source chips — label only; href on click. */
export function SourceButton({
  sources,
  markSingle = false,
}: SourceButtonProps) {
  if (!sources?.length) return null;

  return (
    <span className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 align-middle">
      {markSingle && sources.length === 1 ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">
          单源
        </span>
      ) : null}
      {sources.map((source) => (
        <a
          key={`${source.label}-${source.href}`}
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          title={source.label}
          className="focus-ring inline-flex max-w-[12rem] truncate rounded-sm border border-line bg-paper/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-ink-soft transition hover:border-forest/40 hover:text-forest"
        >
          {source.label}
        </a>
      ))}
    </span>
  );
}
