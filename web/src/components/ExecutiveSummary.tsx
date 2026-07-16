import type { FactLine } from "@/lib/types";
import { asSourcedFacts, factKey } from "@/lib/sourced-facts";
import { accents } from "@/lib/module-accents";
import { Bullet } from "./Bullet";
import { KindLabel } from "./KindLabel";

interface ExecutiveSummaryProps {
  summary: FactLine[];
  signal: string;
  watch: string;
}

export function ExecutiveSummary({
  summary,
  signal,
  watch,
}: ExecutiveSummaryProps) {
  const a = accents.forest;
  const facts = asSourcedFacts(summary);

  return (
    <section
      id="executive-summary"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-14 sm:px-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={`h-6 w-1 rounded-full ${a.headerBar}`} aria-hidden />
        <p
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${a.eyebrow}`}
        >
          Executive summary
        </p>
        <KindLabel kind="fact" />
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        The day in five minutes
      </h2>
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
    </section>
  );
}
