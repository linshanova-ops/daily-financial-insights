const chinaSources = [
  {
    name: "华尔街见闻",
    english: "Wallstreetcn",
    href: "https://wallstreetcn.com/",
    role: "Overnight global closes, China policy calendars, A-share strategy, and cross-asset tape.",
  },
  {
    name: "BlockBeats",
    english: "律动",
    href: "https://www.theblockbeats.info/",
    role: "Crypto–macro transmission — how oil, Fed path, and Asia risk-off hit BTC and other risk assets.",
  },
];

const stages = [
  {
    id: "01",
    name: "Gather",
    skill: "gathering-financial-news",
    summary:
      "Sweep eight news categories into a dated, sourced news log. Undated items are discarded. China desk always includes 华尔街见闻 and BlockBeats.",
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
      "Decode PBOC and fiscal stance first, then read growth engines, markets, and external linkages — with required color from 华尔街见闻 and BlockBeats.",
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
        linshanova is powered by Cursor Agent skills. Each stage only consumes
        what the previous stage verified — analysis cites the news log,
        suggestions cite graded signals, and the published report stays
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

      <div className="mt-16 border-t border-line pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
          China sources
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Required desks for every China section
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          Official prints still come from PBOC, NBS, and CSRC. These two outlets
          are mandatory for China color and crypto–macro linkage on linshanova.
        </p>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {chinaSources.map((source) => (
            <li key={source.name} className="border-t border-line pt-6">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="display text-2xl tracking-tight text-ink transition-colors hover:text-forest"
              >
                {source.name}
              </a>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
                {source.english}
              </p>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                {source.role}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
