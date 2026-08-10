import type { FactLine, ThemeCard } from "@/lib/types";
import { asSourcedFacts, factKey } from "@/lib/sourced-facts";
import { accents } from "@/lib/module-accents";
import { Bullet } from "./Bullet";
import { KindLabel } from "./KindLabel";

interface ExecutiveSummaryProps {
  summary: FactLine[];
  signal: string;
  watch: string;
  themes?: ThemeCard[];
}

export function ExecutiveSummary({
  summary,
  signal,
  watch,
  themes = [],
}: ExecutiveSummaryProps) {
  const a = accents.forest;
  const facts = asSourcedFacts(summary);
  const hasThemes = themes.length > 0;

  return (
    <section
      id="executive-summary"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-10 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={`h-6 w-1 rounded-full ${a.headerBar}`} aria-hidden />
        <p
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${a.eyebrow}`}
        >
          Executive summary
        </p>
        <KindLabel kind={hasThemes ? "judgment" : "fact"} />
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        {hasThemes ? "Jump to today’s themes" : "The day in five minutes"}
      </h2>
      {hasThemes ? (
        <ol className="mt-8 space-y-3 text-base leading-relaxed text-ink-soft sm:text-lg">
          {themes.map((theme, index) => (
            <li key={theme.id} className="flex gap-3">
              <span className="shrink-0 text-sm font-semibold text-ink/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <a
                href={`#theme-${theme.id}`}
                className="focus-ring font-medium text-ink underline-offset-4 transition-colors hover:text-forest hover:underline"
              >
                {theme.title}
                <span className="ml-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                  {theme.grade}
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <ul className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            {facts.map((item, index) => (
              <Bullet
                key={factKey(item, index)}
                dotClass={a.bulletDot}
                sources={item.sources}
              >
                {item.text}
              </Bullet>
            ))}
          </ul>
          <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
            <div className="border-l-2 border-forest/30 bg-forest/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">
                  Signal
                </p>
                <KindLabel kind="judgment" />
              </div>
              <p className="mt-2 text-base leading-relaxed text-ink">{signal}</p>
            </div>
            <div className="border-l-2 border-copper/40 bg-copper/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
                  Watch
                </p>
                <KindLabel kind="judgment" />
              </div>
              <p className="mt-2 text-base leading-relaxed text-ink">{watch}</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
