import type { BriefingFigure, FigurePoint } from "@/lib/types";
import { SourceButton } from "./SourceButton";

interface KeyFiguresProps {
  figures: BriefingFigure[];
}

function formatSigned(value: number, unit?: string): string {
  const sign = value > 0 ? "+" : "";
  const body = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${sign}${body}${unit ?? ""}`;
}

function formatLevel(value: number, unit?: string): string {
  if (unit === "%") return formatSigned(value, unit);
  const body = Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (unit === "$") return `$${body}`;
  if (!unit) return body;
  return `${body}${unit}`;
}

function BarRows({
  points,
  unit,
}: {
  points: FigurePoint[];
  unit?: string;
}) {
  const mixed =
    points.some((p) => p.value < 0) && points.some((p) => p.value > 0);
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.value)), 0.01);

  if (mixed) {
    return (
      <ul className="mt-5 space-y-3" aria-hidden={false}>
        {points.map((point) => {
          const pct = (Math.abs(point.value) / maxAbs) * 50;
          const positive = point.value >= 0;
          return (
            <li key={point.label} className="grid grid-cols-[4.5rem_1fr_4.25rem] items-center gap-2">
              <span className="text-right text-xs font-medium text-ink-soft">
                {point.label}
              </span>
              <div className="relative h-3 overflow-hidden bg-mist-deep/70">
                <span
                  className="absolute top-0 h-full"
                  style={{
                    left: positive ? "50%" : `${50 - pct}%`,
                    width: `${Math.max(pct, 1.5)}%`,
                    background: positive ? "var(--forest)" : "var(--moderate)",
                  }}
                />
                <span
                  className="absolute inset-y-0 left-1/2 w-px bg-ink/15"
                  aria-hidden
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-ink">
                {formatSigned(point.value, unit)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-5 space-y-3">
      {points.map((point) => {
        const pct = (Math.abs(point.value) / maxAbs) * 100;
        return (
          <li key={point.label} className="grid grid-cols-[4.5rem_1fr_4.25rem] items-center gap-2">
            <span className="text-right text-xs font-medium text-ink-soft">
              {point.label}
            </span>
            <div className="h-3 overflow-hidden bg-mist-deep/70">
              <span
                className="block h-full bg-forest"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-ink">
              {formatLevel(point.value, unit)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function FigureSource({ figure }: { figure: BriefingFigure }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
      <SourceButton sources={[figure.source]} />
      {figure.note ? (
        <span className="text-xs text-ink/50">{figure.note}</span>
      ) : null}
    </div>
  );
}

export function KeyFigures({ figures }: KeyFiguresProps) {
  if (!figures.length) return null;

  const stats = figures.filter((f) => f.kind === "stat");
  const charts = figures.filter((f) => f.kind === "bars");

  return (
    <section id="key-figures" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-forest" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Key figures
          </p>
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          Numbers that define the day
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Verified prints from this briefing — each figure links to its primary
          source.
        </p>

        {stats.length ? (
          <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((figure) => (
              <article
                key={figure.id}
                className="border-t-2 border-forest pt-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                  {figure.title}
                </p>
                <p className="display mt-3 text-4xl tracking-tight text-ink tabular-nums">
                  {figure.display}
                </p>
                {figure.delta ? (
                  <p className="mt-2 text-sm leading-snug text-ink-soft">
                    {figure.delta}
                  </p>
                ) : null}
                <FigureSource figure={figure} />
              </article>
            ))}
          </div>
        ) : null}

        {charts.length ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {charts.map((figure) => (
              <article key={figure.id} className="border-t-2 border-forest pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">
                  {figure.title}
                </p>
                <BarRows points={figure.points ?? []} unit={figure.unit} />
                <FigureSource figure={figure} />
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
