import type { FactSource } from "@/lib/types";

interface SourceButtonProps {
  sources?: FactSource[] | null;
}

/** Compact clickable control to open the original source post(s). */
export function SourceButton({ sources }: SourceButtonProps) {
  if (!sources?.length) return null;

  return (
    <span className="mt-1.5 flex flex-wrap gap-2">
      {sources.map((source) => (
        <a
          key={`${source.label}-${source.href}`}
          href={source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center bg-forest px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-paper transition hover:bg-forest-bright"
        >
          Source · {source.label}
        </a>
      ))}
    </span>
  );
}
