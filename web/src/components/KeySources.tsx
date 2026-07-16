import type { SourceLink } from "@/lib/source-links";
import { DEFAULT_KEY_SOURCES } from "@/lib/source-links";

interface KeySourcesProps {
  sources?: SourceLink[] | null;
}

export function KeySources({ sources }: KeySourcesProps) {
  const items = sources?.length ? sources : DEFAULT_KEY_SOURCES;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-4 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
        Key source links
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {items.map((source) => (
          <li key={`${source.label}-${source.href}`}>
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring text-sm font-semibold text-forest underline decoration-copper/50 underline-offset-4 transition hover:text-forest-bright"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
