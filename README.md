# Daily Financial Insights

Cursor Agent Skills for the full daily financial research pipeline — from gathering the latest global and China financial news to a finished briefing with practical suggestions — plus a website that publishes those briefings.

**Entry point (agent):** ask for a "daily financial briefing" (or invoke `/daily-financial-briefing`). It orchestrates the stages below in order.

**Entry point (website):** [syravocado](https://linshanova-ops.github.io/daily-financial-insights/) — Next.js app in [`web/`](./web/) that renders briefings from `web/content/briefings/` and live-polls the JSON feed on `main`.

## Public website (permanent)

See **[docs/PUBLIC_SITE.md](./docs/PUBLIC_SITE.md)** for GitHub Pages, on-demand **Refresh now** (Netlify function + `GITHUB_PAT`), and `CURSOR_API_KEY` setup.

- Permanent URL: https://linshanova-ops.github.io/daily-financial-insights/
- Auto-deploy: push to `main`
- Updates: visitors click **Refresh now** to generate a new briefing (not a fixed 4-hour cron)

| Skill | Stage | Purpose |
|-------|-------|---------|
| `daily-financial-briefing` | Orchestrator | Runs the pipeline end-to-end with quality gates between stages |
| `gathering-financial-news` | 1 | Sweeps 8 news categories into a dated, sourced news log (+ source-quality reference) |
| `analyzing-global-macro` | 2 | World-level situation assessment: policy, growth/inflation, risk sentiment, linkages |
| `analyzing-china-macro` | 3 | China-level assessment: policy stance decoding, property, markets, external links |
| `interpreting-market-signals` | 4 | Extracts graded, falsifiable signals (+ signal playbook with divergences, non-reactions, second-order effects) |
| `generating-actionable-insights` | 5 | Converts signals into ≤5 prioritized watchpoints, each with a trigger and an invalidator |
| `writing-daily-financial-report` | 6 | Assembles everything into the final report (+ report template) |

Each stage skill also works standalone (e.g. "what does this news signal?" triggers `interpreting-market-signals` directly).

## Website

```bash
cd web
npm install
npm run dev
```

Seed briefing: `web/content/briefings/2026-07-13.md`. Design and implementation notes live under `docs/superpowers/`.

## Skills setup

Clone this repo into your project (or copy `.cursor/skills/financial-research/` into an existing project's `.cursor/skills/` directory). Cursor discovers skills automatically from `.cursor/skills/`.

## Usage

```
Give me today's daily financial briefing
```

Or invoke individual stages:

```
What does today's PBOC statement signal?
Analyze China's macro situation from today's news
```

All output is research synthesis, not investment advice.
