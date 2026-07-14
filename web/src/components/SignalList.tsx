import type { Signal, SignalGrade } from "@/lib/types";

const gradeStyles: Record<SignalGrade, string> = {
  STRONG: "bg-strong/10 text-strong",
  MODERATE: "bg-moderate/10 text-moderate",
  WEAK: "bg-weak/10 text-weak",
};

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        Signals
      </p>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        What the day reveals
      </h2>
      <ol className="mt-10 space-y-8">
        {signals.map((signal, index) => (
          <li
            key={signal.name}
            className={`grade-pulse border-b border-line pb-8 last:border-b-0 ${
              index === 0 ? "" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`px-2.5 py-1 text-xs font-bold tracking-[0.14em] ${gradeStyles[signal.grade]}`}
              >
                {signal.grade}
              </span>
              <h3 className="display text-2xl tracking-tight text-ink">
                {signal.name}
              </h3>
            </div>
            <dl className="mt-4 grid gap-3 text-sm leading-relaxed text-ink-soft sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink">Evidence</dt>
                <dd className="mt-1">{signal.evidence}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Mechanism</dt>
                <dd className="mt-1">{signal.mechanism}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink">Disproved if</dt>
                <dd className="mt-1">{signal.disprovedIf}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
