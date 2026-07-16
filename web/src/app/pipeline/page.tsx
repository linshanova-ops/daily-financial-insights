const usSources = [
  {
    name: "Federal Reserve / BLS",
    english: "Primary US",
    href: "https://www.federalreserve.gov/",
    role: "Official policy, testimony, CPI/PPI/employment prints — tier-1 numbers only.",
  },
  {
    name: "US Treasury yield curve",
    english: "Rates primary",
    href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve",
    role: "Daily Treasury yield curve — preferred primary for 2y/10y levels and curve moves.",
  },
  {
    name: "CME FedWatch + Reuters/WSJ",
    english: "Market path",
    href: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
    role: "Implied Fed path plus wire tape for US equities, rates, and cross-asset settles.",
  },
  {
    name: "Yahoo Finance",
    english: "Quotes / secondary",
    href: "https://finance.yahoo.com/",
    role: "US index and equity quote checks plus secondary headlines — not a substitute for wires or primary prints.",
  },
];

const chinaSources = [
  {
    name: "华尔街见闻",
    english: "Wallstreetcn",
    href: "https://wallstreetcn.com/",
    role: "Overnight global closes, China policy calendars, A-share strategy, and cross-asset tape.",
  },
  {
    name: "财新 / Caixin",
    english: "Caixin Global",
    href: "https://www.caixinglobal.com/",
    role: "Independent China financial journalism — property, banking, local debt, and policy depth.",
  },
  {
    name: "第一财经",
    english: "Yicai",
    href: "https://www.yicai.com/",
    role: "PBOC OMO detail, onshore policy color, and same-day China macro/market reporting.",
  },
  {
    name: "BlockBeats",
    english: "律动",
    href: "https://www.theblockbeats.info/",
    role: "Crypto–macro transmission — how oil, Fed path, and Asia risk-off hit BTC and other risk assets.",
  },
  {
    name: "PBOC / NBS / 财联社",
    english: "Official + flash",
    href: "http://www.pbc.gov.cn/",
    role: "Policy rates and OMO from PBOC; macro prints from NBS; CLS for fastest A-share flashes.",
  },
];

const stages = [
  {
    id: "01",
    name: "Gather",
    skill: "gathering-financial-news",
    summary:
      "Sweep eight news categories into a dated, sourced news log. Prefer primary US (Fed/BLS/Treasury yield curve) and China (PBOC/NBS) prints; use Yahoo Finance for US quote checks; always include 华尔街见闻, Caixin/Yicai, and BlockBeats.",
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
      "Decode PBOC and fiscal stance first, then read growth engines, markets, and external linkages — with required color from 华尔街见闻, Caixin/第一财经, and BlockBeats.",
  },
  {
    id: "04",
    name: "Signals + asset framework",
    skill: "interpreting-market-signals",
    summary:
      "Extract graded, falsifiable signals, then apply the stable asset framework: for each major asset, name the dominant regime (beta), today's driver, the read, and the regime invalidator.",
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
      "Assemble the briefing for a busy reader — summary, global, China, asset framework, signals, watch list. The website publishes this final stage.",
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
        syravocado is powered by Cursor Agent skills. Each stage only consumes
        what the previous stage verified — analysis cites the news log,
        suggestions cite graded signals, and the published report stays
        traceable. Visitors trigger a new run with{" "}
        <span className="font-semibold text-ink">Refresh now</span> on the
        homepage (rate-limited).
      </p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Accuracy policy:</span> every
        published briefing must use dated, coverage-window sources. Wrong-year
        or unsupported quotes are rejected — a shorter accurate briefing beats
        a wrong figure. Before deploy, an automated scan fetches{" "}
        <span className="font-semibold text-ink">every cited source</span> and
        checks that the page supports the claimed numbers — site-wide, not one
        section.
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure">
          US sources
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Primary desks for the global section
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {usSources.map((source) => (
            <li key={source.name} className="border-t border-azure/30 pt-6">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="display text-2xl tracking-tight text-ink transition-colors hover:text-azure"
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

      <div className="mt-16 border-t border-line pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-crimson">
          China sources
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Required desks for every China section
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          Official prints still come from PBOC, NBS, and CSRC. Wallstreetcn,
          Caixin/第一财经, and BlockBeats are mandatory for China color, policy
          depth, and crypto–macro linkage.
        </p>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {chinaSources.map((source) => (
            <li key={source.name} className="border-t border-crimson/30 pt-6">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="display text-2xl tracking-tight text-ink transition-colors hover:text-crimson"
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
