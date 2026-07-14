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
  return (
    <section
      id="executive-summary"
      className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-14 sm:px-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        Executive summary
      </p>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        The day in five minutes
      </h2>
      <ul className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft sm:text-lg">
        {summary.map((item) => (
          <li key={item} className="border-l-2 border-forest/40 pl-4">
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">
            Signal
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{signal}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
            Watch
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{watch}</p>
        </div>
      </div>
    </section>
  );
}
