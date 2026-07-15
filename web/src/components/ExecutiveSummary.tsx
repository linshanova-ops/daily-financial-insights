import { accents } from "@/lib/module-accents";
import { Bullet } from "./Bullet";

interface ExecutiveSummaryProps {
  summary: string[];
  signal: string;
  watch: string;
}

export function ExecutiveSummary({
  summary,
  signal,
  watch,
}: ExecutiveSummaryProps) {
  const a = accents.forest;

  return (
    <section
      id="executive-summary"
      className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-14 sm:px-8"
    >
      <div className="flex items-center gap-3">
        <span className={`h-6 w-1 rounded-full ${a.headerBar}`} aria-hidden />
        <p
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${a.eyebrow}`}
        >
          Executive summary
        </p>
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        The day in five minutes
      </h2>
      <ul className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft sm:text-lg">
        {summary.map((item) => (
          <Bullet key={item} dotClass={a.bulletDot}>
            {item}
          </Bullet>
        ))}
      </ul>
      <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
        <div className="border-l-2 border-forest/30 bg-forest/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">
            Signal
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{signal}</p>
        </div>
        <div className="border-l-2 border-copper/40 bg-copper/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
            Watch
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{watch}</p>
        </div>
      </div>
    </section>
  );
}
