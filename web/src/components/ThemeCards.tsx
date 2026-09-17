import type { SignalGrade, ThemeCard } from "@/lib/types";
import { themesByGrade } from "@/lib/theme-grade-order";
import { SourceButton } from "./SourceButton";

const gradeStyles: Record<SignalGrade, string> = {
  STRONG: "bg-strong/10 text-strong",
  MODERATE: "bg-moderate/10 text-moderate",
  WEAK: "bg-weak/10 text-weak",
};

interface ThemeCardsProps {
  themes: ThemeCard[];
}

/** Split folded YAML into one line per sentence so cites aren't a wall. */
// ponytail: period + space; skip U.S./U.K. so "U.S. Treasury" stays one line.
function lines(text: string): string[] {
  return text.trim().split(/(?<!U\.S)(?<!U\.K)(?<=[.。])\s+/).filter(Boolean);
}

/** First ": " is the cite; rest is the print. Skip if the head looks like a clock. */
// ponytail: first ": " within 48 chars; FactLine[] per bullet if prefixes stop matching.
function CiteLine({ line }: { line: string }) {
  const cut = line.indexOf(": ");
  const head = cut > 0 ? line.slice(0, cut) : "";
  if (cut > 0 && cut <= 48 && !/^\d{1,2}$/.test(head)) {
    return (
      <li>
        <span className="font-semibold text-ink">{`${head}：`}</span>
        {line.slice(cut + 2)}
      </li>
    );
  }
  return <li>{line}</li>;
}

/** Cross-asset forces: fact lines, then so-what as judgment prose. */
export function ThemeCards({ themes }: ThemeCardsProps) {
  if (!themes.length) return null;
  const ordered = themesByGrade(themes);

  return (
    <section
      id="themes"
      className="section-band scroll-mt-28 border-y border-line/60 bg-paper/40"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-amber" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
            Today&apos;s themes
          </p>
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          What moves markets today
        </h2>
        <ol className="mt-8 space-y-6">
          {ordered.map((theme, index) => (
            <li
              key={theme.id}
              id={`theme-${theme.id}`}
              className="scroll-mt-28 border-b border-line pb-6 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-ink/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  {theme.title}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-bold tracking-[0.14em] ${gradeStyles[theme.grade]}`}
                >
                  {theme.grade}
                </span>
                {theme.assets?.length ? (
                  <span className="text-xs tracking-wide text-ink/45">
                    {theme.assets.join(" · ")}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">
                    Fact
                  </p>
                  <ul className="mt-2 space-y-2 text-base leading-relaxed text-ink-soft">
                    {lines(theme.fact).map((line, i) => (
                      <CiteLine key={i} line={line} />
                    ))}
                  </ul>
                  {theme.factSources?.length ? (
                    <div className="mt-2">
                      <SourceButton sources={theme.factSources} />
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">
                    So what
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-ink-soft">
                    {theme.mechanism}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
