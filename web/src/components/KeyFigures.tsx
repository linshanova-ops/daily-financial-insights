import type { BriefingFigure } from "@/lib/types";

interface KeyFiguresProps {
  figures: BriefingFigure[];
}

function formatBarValue(value: number, unit?: string): string {
  const sign = value > 0 ? "+" : "";
  const body = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${sign}${body}${unit ?? ""}`;
}

function formatLevel(value: number, unit?: string): string {
  if (unit === "%") return formatBarValue(value, unit);
  const body = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return unit ? `${body}${unit}` : body;
}

function BarsChart({ figure }: { figure: BriefingFigure }) {
  const points = figure.points ?? [];
  if (!points.length) return null;

  const mixedSigns = points.some((p) => p.value < 0) && points.some((p) => p.value > 0);
  const width = 360;
  const rowH = 28;
  const height = points.length * rowH + 8;
  const labelW = 72;
  const valueW = 56;
  const chartW = width - labelW - valueW;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-md"
      role="img"
      aria-label={figure.title}
    >
      {mixedSigns ? (
        <>
          {(() => {
            const maxAbs = Math.max(...points.map((p) => Math.abs(p.value)), 0.01);
            const zeroX = labelW + chartW / 2;
            return (
              <>
                <line
                  x1={zeroX}
                  y1={4}
                  x2={zeroX}
                  y2={height - 4}
                  stroke="rgba(20,16,18,0.12)"
                  strokeWidth={1}
                />
                {points.map((point, index) => {
                  const y = 8 + index * rowH;
                  const barW = (Math.abs(point.value) / maxAbs) * (chartW / 2 - 4);
                  const x = point.value >= 0 ? zeroX : zeroX - barW;
                  const fill = point.value >= 0 ? "#7a1c28" : "#9a6116";
                  return (
                    <g key={point.label}>
                      <text
                        x={labelW - 8}
                        y={y + 14}
                        textAnchor="end"
                        fill="#3a3034"
                        style={{ fontSize: 11 }}
                      >
                        {point.label}
                      </text>
                      <rect
                        x={x}
                        y={y + 4}
                        width={Math.max(barW, 2)}
                        height={14}
                        fill={fill}
                        rx={2}
                      />
                      <text
                        x={point.value >= 0 ? x + barW + 6 : x - 6}
                        y={y + 15}
                        textAnchor={point.value >= 0 ? "start" : "end"}
                        fill="#141012"
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {formatLevel(point.value, figure.unit)}
                      </text>
                    </g>
                  );
                })}
              </>
            );
          })()}
        </>
      ) : (
        <>
          {(() => {
            const maxVal = Math.max(...points.map((p) => Math.abs(p.value)), 0.01);
            return points.map((point, index) => {
              const y = 8 + index * rowH;
              const barW = (Math.abs(point.value) / maxVal) * (chartW - 8);
              return (
                <g key={point.label}>
                  <text
                    x={labelW - 8}
                    y={y + 14}
                    textAnchor="end"
                    fill="#3a3034"
                    style={{ fontSize: 11 }}
                  >
                    {point.label}
                  </text>
                  <rect
                    x={labelW}
                    y={y + 4}
                    width={Math.max(barW, 2)}
                    height={14}
                    fill="#7a1c28"
                    rx={2}
                  />
                  <text
                    x={labelW + barW + 8}
                    y={y + 15}
                    textAnchor="start"
                    fill="#141012"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {formatLevel(point.value, figure.unit)}
                  </text>
                </g>
              );
            });
          })()}
        </>
      )}
    </svg>
  );
}

function StatCard({ figure }: { figure: BriefingFigure }) {
  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
        {figure.title}
      </p>
      <p className="display text-3xl tracking-tight text-ink sm:text-4xl">
        {figure.display}
      </p>
      {figure.delta ? (
        <p className="text-sm font-medium text-ink-soft">{figure.delta}</p>
      ) : null}
    </div>
  );
}

export function KeyFigures({ figures }: KeyFiguresProps) {
  if (!figures.length) return null;

  const stats = figures.filter((f) => f.kind === "stat");
  const charts = figures.filter((f) => f.kind === "bars");

  return (
    <section
      id="key-figures"
      className="section-band scroll-mt-24 border-y border-line/70 bg-paper/70"
    >
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
          Sourced values from this briefing only — each figure links to its
          primary desk.
        </p>

        {stats.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((figure) => (
              <article
                key={figure.id}
                className="border border-line/80 bg-mist/40 px-5 py-5"
              >
                <StatCard figure={figure} />
                <a
                  href={figure.source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs font-semibold text-forest underline decoration-copper/50 underline-offset-4 focus-ring"
                >
                  Source · {figure.source.label}
                </a>
                {figure.note ? (
                  <p className="mt-2 text-xs text-ink/50">{figure.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {charts.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {charts.map((figure) => (
              <article
                key={figure.id}
                className="border border-line/80 bg-mist/40 px-5 py-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
                  {figure.title}
                </p>
                <div className="mt-4">
                  <BarsChart figure={figure} />
                </div>
                <a
                  href={figure.source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-xs font-semibold text-forest underline decoration-copper/50 underline-offset-4 focus-ring"
                >
                  Source · {figure.source.label}
                </a>
                {figure.note ? (
                  <p className="mt-2 text-xs text-ink/50">{figure.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
