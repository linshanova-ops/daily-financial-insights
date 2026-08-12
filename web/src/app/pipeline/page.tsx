const inboxSources = [
  {
    name: "Bloomberg Markets Daily China",
    english: "财经早茶 / IMAP",
    href: "https://www.bloomberg.com/asia",
    role: "Primary overnight desk — 市场一览, 今日图表, calendar, and theme seeds. Merged from IMAP before web corroboration.",
  },
  {
    name: "Glassnode Insights",
    english: "On-chain / weekly",
    href: "https://research.glassnode.com/",
    role: "Crypto framework color when a real Week-on-Chain / Insights issue lands — welcome mail and promo Compass are skipped.",
  },
];

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
    name: "AP / Reuters / CNBC",
    english: "Wire tape",
    href: "https://apnews.com/",
    role: "Same-day equity/oil wraps and financing color — corroborate inbox desk claims.",
  },
  {
    name: "Yahoo Finance",
    english: "Quotes / secondary",
    href: "https://finance.yahoo.com/",
    role: "Index, FX, and futures quote checks for Market Dashboard — not a substitute for wires or primary prints.",
  },
];

const chinaSources = [
  {
    name: "华尔街见闻",
    english: "Wallstreetcn",
    href: "https://wallstreetcn.com/",
    role: "Overnight global closes, CPI/CTA tape, A-share strategy, and cross-asset color in the coverage window.",
  },
  {
    name: "财新 / Caixin",
    english: "Caixin Global",
    href: "https://www.caixinglobal.com/",
    role: "Independent China depth — autos, tech/financing, property, policy. Prefer dated Global URLs that verify in CI.",
  },
  {
    name: "第一财经",
    english: "Yicai",
    href: "https://www.yicai.com/",
    role: "Onshore policy and same-day China macro/market reporting (e.g. Nvidia financing, PBOC OMO).",
  },
  {
    name: "BlockBeats",
    english: "律动",
    href: "https://www.theblockbeats.info/",
    role: "Crypto–macro and Asia risk transmission (BTC, gold, yen). Tier 3 — verify prices/years against CoinGecko/Yahoo.",
  },
  {
    name: "PBOC / NBS / 财联社",
    english: "Official + flash",
    href: "http://www.pbc.gov.cn/",
    role: "Policy rates and OMO from PBOC; macro prints from NBS; CLS/Sina for fastest A-share flashes.",
  },
];

const claimSources = [
  {
    name: "中金点睛 (CICC)",
    english: "CLAIM desk",
    href: "https://www.research.cicc.com/",
    role: "Sell-side CLAIM only via cicc-research-article-search (theme-then-search). Public paraphrase + WeChat/research link — never invent, never VIP reprint. Attach to Themes, not What-changed.",
  },
];

const stages = [
  {
    id: "01",
    name: "Inbox + gather",
    skill: "gathering-financial-news / IMAP",
    summary:
      "Merge Bloomberg (and Glassnode when real) from inbox first. Then sweep primaries (Fed/BLS/Treasury, PBOC/NBS) and corroboration desks — 华尔街见闻, Caixin/Yicai, BlockBeats — only for coverage-window items. Note omissions; do not pad.",
  },
  {
    id: "02",
    name: "Global + China analysis",
    skill: "analyzing-global-macro / analyzing-china-macro",
    summary:
      "Regime vs today’s delta. China: official prints first, then WS/Caixin/Yicai/BlockBeats color. CICC only as CLAIM when a real note exists.",
  },
  {
    id: "03",
    name: "Themes + asset lens",
    skill: "interpreting-market-signals",
    summary:
      "Publish 3–6 themeCards (fact → mechanism → trigger/invalidator). Site narrative lives in Themes — signals stay empty ([]). Asset classes hold the same themes under a six-bucket lens.",
  },
  {
    id: "04",
    name: "Dashboard + calendar",
    skill: "fetch-market-closes / eventCalendar",
    summary:
      "Inject live Market Dashboard closes. Event Calendar = dated prints from briefing day through next Friday (mainland China + US fixtures) — not a second Themes list.",
  },
  {
    id: "05",
    name: "Verify + publish",
    skill: "verify-briefing / MANUAL_BRIEFING",
    summary:
      "Manual publish only. npm run verify-briefing fetches every cited href and checks claim numbers. Commit markdown + JSON together; Pages deploys on merge to main.",
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
        From inbox to a five-minute briefing
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        syravocado is inbox-first and editor-triggered: Bloomberg desk mail
        seeds Themes; web desks corroborate; the site shows Themes, Market
        Dashboard, Event Calendar, and Detail — not a separate Signals strip.
        New editions publish when an editor asks.
      </p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Accuracy policy:</span> every
        published briefing must use dated, coverage-window sources. Wrong-year
        or unsupported quotes are rejected — a shorter accurate briefing beats
        a wrong figure. Before deploy,{" "}
        <span className="font-semibold text-ink">verify-briefing</span> fetches
        every cited source and checks that the page supports the claimed
        numbers.
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
                  This website is the presentation layer for stage 05.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-16 border-t border-line pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
          Inbox tier
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Seed the day before the open web
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {inboxSources.map((source) => (
            <li key={source.name} className="border-t border-forest/30 pt-6">
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

      <div className="mt-16 border-t border-line pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure">
          US / primary
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Officials and wires for Global
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
          China corroboration
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Desks to check every China day
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
          Aim for at least one coverage-window cite each from 华尔街见闻,
          Caixin or 第一财经, and BlockBeats — or say so in caveats when a desk
          is empty/unreachable. Official prints still come from PBOC, NBS, and
          CSRC.
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

      <div className="mt-16 border-t border-line pt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
          CLAIM desk
        </p>
        <h2 className="display mt-3 max-w-3xl text-3xl tracking-tight text-ink sm:text-4xl">
          Views only when the note is real
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {claimSources.map((source) => (
            <li key={source.name} className="border-t border-copper/40 pt-6">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="display text-2xl tracking-tight text-ink transition-colors hover:text-copper"
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
