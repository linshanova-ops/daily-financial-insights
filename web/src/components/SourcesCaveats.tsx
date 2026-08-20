import type { KeySource } from "@/lib/types";
import { linkifySources } from "@/lib/source-links";
import Link from "next/link";

interface SourcesCaveatsProps {
  sources: string;
  singleSource: string;
  keySources?: KeySource[];
}

const BOOK_LABELS: Record<string, string> = {
  "us-equities": "US equities",
  "asia-equities": "Asia equities",
  rates: "Rates",
  fx: "FX",
  commodities: "Commodities",
  crypto: "Crypto",
};

function LinkedSourceText({ text }: { text: string }) {
  const parts = linkifySources(text);
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={`t-${index}`}>{part}</span>
        ) : (
          <a
            key={`${part.label}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring font-semibold text-forest underline decoration-copper/40 underline-offset-4 transition hover:text-forest-bright"
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}

function bookLabel(id: string) {
  return BOOK_LABELS[id] ?? id;
}

function isClassified(sources: KeySource[]) {
  return sources.some((s) => s.books?.length || s.influence);
}

export function SourcesCaveats({
  sources,
  singleSource,
  keySources = [],
}: SourcesCaveatsProps) {
  const classified = isClassified(keySources);

  return (
    <section
      id="sources"
      className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 py-14 sm:px-8"
    >
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-ink/50" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/60">
          Sources & caveats
        </p>
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        Where the numbers came from
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {classified
          ? "Each source once. Tags are the books the print actually moves."
          : "Clickable sources for this edition."}{" "}
        Pipeline / publish mechanics live on the{" "}
        <Link
          href="/pipeline/"
          className="focus-ring font-semibold text-forest underline decoration-copper/40 underline-offset-4"
        >
          Pipeline
        </Link>{" "}
        page.
      </p>

      {classified ? (
        <ul className="mt-8 space-y-5">
          {keySources.map((s) => (
            <li
              key={`${s.label}-${s.href}`}
              className="border-t border-line/70 pt-4"
            >
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring font-semibold text-forest underline decoration-copper/40 underline-offset-4 transition hover:text-forest-bright"
              >
                {s.label}
              </a>
              {s.books?.length ? (
                <p className="mt-1 text-xs tracking-wide text-ink/45">
                  {s.books.map(bookLabel).join(" · ")}
                </p>
              ) : null}
              {s.influence ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
                  {s.influence}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : keySources.length ? (
        <ul className="mt-8 flex flex-wrap gap-2">
          {keySources.map((s) => (
            <li key={`${s.label}-${s.href}`}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex rounded-sm border border-line bg-paper/80 px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-forest/40 hover:text-forest"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {sources?.trim() ? (
        <p className="mt-8 text-sm leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">
            {classified ? "Also on What-changed: " : "Also consulted: "}
          </span>
          <LinkedSourceText text={sources} />
        </p>
      ) : null}

      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Single-source risk: </span>
          {singleSource}
        </p>
      </div>
      <blockquote className="mt-8 border-l-2 border-forest pl-4 text-sm italic leading-relaxed text-ink-soft">
        This report is research and information synthesis, not investment
        advice. Verify figures against primary sources before acting on them.
      </blockquote>
    </section>
  );
}
