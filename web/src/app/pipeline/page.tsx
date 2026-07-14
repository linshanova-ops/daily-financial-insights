const stages = [
  {
    id: "01",
    name: "Gather",
    skill: "gathering-financial-news",
    summary:
      "Sweep eight news categories into a dated, sourced news log. Undated items are discarded.",
  },
  {
    id: "02",
    name: "Global analysis",
    skill: "analyzing-global-macro",
    summary:
      "Assess world regime vs. today's delta across policy, growth/inflation, risk sentiment, and cross-border linkages.",
  },
  {
    id: "03",
    name: "China analysis",
    skill: "analyzing-china-macro",
    summary:
      "Decode PBOC and fiscal stance first, then read growth engines, markets, and external linkages.",
  },
  {
    id: "04",
    name: "Signals",
    skill: "interpreting-market-signals",
    summary:
      "Extract graded, falsifiable inferences — each with evidence, mechanism, and a disproof condition.",
  },
  {
    id: "05",
    name: "Suggestions",
    skill: "generating-actionable-insights",
    summary:
      "Convert signals into at most five watchpoints, each with a trigger and an invalidator.",
  },
  {
    id: "06",
    name: "Report",
    skill: "writing-daily-financial-report",
    summary:
      "Assemble the briefing for a busy reader. The website publishes this final stage.",
  },
];

export const metadata = {
  title: "Pipeline",
};

export default function PipelinePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        Research pipeline
      </p>
      <h1 className="display mt-3 max-w-3xl text-4xl tracking-tight text-ink sm:text-6xl">
        From raw news to a five-minute briefing
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Daily Financial Insights is powered by Cursor Agent skills. Each stage
        only consumes what the previous stage verified — analysis cites the news
        log, suggestions cite graded signals, and the published report stays
        traceable.
      </p>

      <ol className="mt-14 space-y-0">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className="grid gap-4 border-t border-line py-8 md:grid-cols-[120px_1fr] md:gap-10"
          >
            <div className="display text-4xl text-forest/70">{stage.id}</div>
            <div>
              <h2 className="display text-2xl tracking-tight text-ink">
                {stage.name}
              </h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
                {stage.skill}
              </p>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
                {stage.summary}
              </p>
              {index === stages.length - 1 ? (
                <p className="mt-4 text-sm font-medium text-forest">
                  This website is the presentation layer for stage 06.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
