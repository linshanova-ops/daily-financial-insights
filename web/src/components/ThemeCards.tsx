"use client";

import type { SignalGrade, ThemeCard } from "@/lib/types";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

const gradeStyles: Record<SignalGrade, string> = {
  STRONG: "bg-strong/10 text-strong",
  MODERATE: "bg-moderate/10 text-moderate",
  WEAK: "bg-weak/10 text-weak",
};

interface ThemeCardsProps {
  themes: ThemeCard[];
}

/** Primary narrative home: one event → one full expansion. */
export function ThemeCards({ themes }: ThemeCardsProps) {
  if (!themes.length) return null;

  return (
    <section
      id="themes"
      className="section-band scroll-mt-28 border-y border-line/60 bg-paper/40"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-amber" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
            Today&apos;s themes
          </p>
          <KindLabel kind="judgment" />
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          One story, fully told
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each theme is the only full narrative of that event (fact → mechanism →
          watch → invalidate). Other modules link here — they do not re-tell it.
        </p>
        <ol className="mt-10 space-y-10">
          {themes.map((theme, index) => (
            <li
              key={theme.id}
              id={`theme-${theme.id}`}
              className="scroll-mt-28 border-b border-line pb-10 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-sm font-semibold text-ink/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`px-2.5 py-1 text-xs font-bold tracking-[0.14em] ${gradeStyles[theme.grade]}`}
                >
                  {theme.grade}
                </span>
                <span className="text-xs uppercase tracking-[0.16em] text-ink/40">
                  {theme.status}
                </span>
                {theme.assets?.length ? (
                  <span className="text-xs tracking-wide text-ink/45">
                    {theme.assets.join(" · ")}
                  </span>
                ) : null}
              </div>
              <h3 className="display mt-2 text-2xl tracking-tight text-ink sm:text-3xl">
                {theme.title}
              </h3>
              <dl className="mt-5 grid gap-4 text-sm leading-relaxed text-ink-soft sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Fact <KindLabel kind="fact" />
                  </dt>
                  <dd className="mt-1">
                    {theme.fact}
                    <SourceButton sources={theme.factSources} />
                  </dd>
                </div>
                <div>
                  <dt className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    Mechanism <KindLabel kind="judgment" />
                  </dt>
                  <dd className="mt-1">{theme.mechanism}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Horizon</dt>
                  <dd className="mt-1">{theme.horizon}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Watch for</dt>
                  <dd className="mt-1">{theme.trigger}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Invalidated if</dt>
                  <dd className="mt-1">{theme.invalidator}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
