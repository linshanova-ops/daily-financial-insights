"use client";

import type { Signal, SignalGrade } from "@/lib/types";
import { CollapseToggle, useCollapsedList } from "./CollapsibleList";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

const gradeStyles: Record<SignalGrade, string> = {
  STRONG: "bg-strong/10 text-strong",
  MODERATE: "bg-moderate/10 text-moderate",
  WEAK: "bg-weak/10 text-weak",
};

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  const { visible, needsCollapse, expanded, hiddenCount, toggle } =
    useCollapsedList(signals, 4);

  return (
    <section id="signals" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-amber" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
            Signals
          </p>
          <KindLabel kind="judgment" />
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          What the day reveals
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Evidence rows are facts from the day&apos;s tape. Mechanism and
          &ldquo;disproved if&rdquo; are interpretive judgments.
        </p>
        <ol className="mt-10 space-y-8">
          {visible.map((signal) => (
            <li
              key={signal.name}
              className="grade-pulse border-b border-line pb-8 last:border-b-0"
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
                  <dt className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Evidence <KindLabel kind="fact" />
                  </dt>
                  <dd className="mt-1">
                    {signal.evidence}
                    <SourceButton sources={signal.evidenceSources} />
                  </dd>
                </div>
                <div>
                  <dt className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Mechanism <KindLabel kind="judgment" />
                  </dt>
                  <dd className="mt-1">{signal.mechanism}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Disproved if <KindLabel kind="judgment" />
                  </dt>
                  <dd className="mt-1">{signal.disprovedIf}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        {needsCollapse ? (
          <CollapseToggle
            expanded={expanded}
            hiddenCount={hiddenCount}
            onToggle={toggle}
            moreLabel="Show more signals"
          />
        ) : null}
      </div>
    </section>
  );
}
