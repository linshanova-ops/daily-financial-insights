import type { MarketOverview as MarketOverviewData } from "@/lib/types";
import { accents } from "@/lib/module-accents";
import { SourceButton } from "./SourceButton";

interface MarketOverviewProps {
  data: MarketOverviewData;
}

export function MarketOverview({ data }: MarketOverviewProps) {
  const items = data.items?.filter((i) => i.label && i.text) ?? [];
  if (!items.length) return null;

  const accent = accents.copper;

  return (
    <section id="market-overview" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            className={`h-6 w-1 rounded-full ${accent.headerBar}`}
            aria-hidden
          />
          <p
            className={`text-xs font-semibold uppercase tracking-[0.24em] ${accent.eyebrow}`}
          >
            Market tape
          </p>
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          Morning desk tape
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Qualitative color from 彭博 Markets Daily China / 财经早茶
          {data.asOfDate ? ` (${data.asOfDate})` : ""}. Desk narrative only —
          official closes are in Market closes below.
        </p>

        <ul className="mt-8 divide-y divide-line/70 border-y border-line/70">
          {items.map((item) => (
            <li
              key={item.label}
              className="grid gap-2 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-6 sm:items-baseline"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                {item.label}
              </p>
              <p className="text-sm leading-relaxed text-ink sm:text-base">
                {item.text}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SourceButton sources={[data.source]} />
          {data.note ? (
            <span className="text-xs text-ink/50">{data.note}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
