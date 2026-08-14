---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC CLAIM, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**Preflight (before gather):** `git fetch origin main`. If `web/content/briefings/$TODAY.md` is already on `origin/main`, stop. Concurrent cap is 1 — if another agent is already RUNNING, that session publishes; do not Retry. After merge, stop (do not leave this run open into the next weekday 09:00 Beijing).

Yahoo `finance.yahoo.com/quote/` HTML is not a close print. Inject levels belong only in `marketDashboard`. Do not copy them into sourced summary/drivers.

Quality bar = a manual morning publish (e.g. `web/content/briefings/2026-08-13.md`). Clone **keys** from the latest briefing; rewrite **content**. Ponytail applies to code diffs only — do **not** skip gather, CICC, or China desks.

## Pipeline (run in order)

Read and execute these skills; do not jump to YAML:

1. `gathering-financial-news` — 8 categories; coverage = last ~24–36h (Monday: since Friday US close, include weekend crypto/geo).
2. `analyzing-global-macro` + `analyzing-china-macro`
3. `interpreting-market-signals` + `generating-actionable-insights` (watch list lives in Themes + Event Calendar; website `signals: []`)
4. `writing-daily-financial-report` + `docs/CONTENT_ACCURACY.md`

## Inputs

1. Beijing date `YYYY-MM-DD` = today `Asia/Shanghai`.
2. Inbox: `web/content/inbox/` (Bloomberg 财经早茶 + Glassnode if present). If IMAP secrets exist, fetch. Else `gh workflow run "Generate daily briefing"` (`cursorAutoGenerate` stays false — inbox/calendar/Fund only), wait, `git pull origin main`.
3. Inbox map: 国际要闻 → `globalChanged` (Chinese, one bullet each); 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` (never invent levels); 日程/央行动态 → `eventCalendar`; 今日图表 → `figures` id `bloomberg-chart-of-day` (open the PNG; analysis must name the metric/levels).
4. China minimum: in-window cite from **华尔街见闻**, **Caixin or 第一财经**, and **BlockBeats** — or name the miss in `singleSource`.
5. **CICC (required attempt):** theme-then-search via `cicc-research-article-search` (`APP_ID`/`APP_SECRET`; `python3 .cursor/skills/cicc-research-article-search/scripts/get_data.py "<theme>" --no-save`). Paraphrase only. Label **CLAIM**, never FACT. Put on matching `themeCards` / `globalImplies` — not as a What-changed print. Public cite = WeChat if that is what the skill returns. No VIP reprint. No invented notes. If env/search fails: say so in `singleSource`.

## FACT vs CLAIM (judgment)

- **FACT:** primary or triangulated print (BLS, AP close, Treasury, PR Newswire, Yicai OMO, Yahoo official index).
- **CLAIM:** inbox desk, third-party view, CICC, unverified size — prefix `CLAIM` / `desk`. Never promote CLAIM to a close/print.
- Beat/miss vs **estimate** only. `10亿元 = CNY1bn`. Crypto: two dated sources. Omit unverifiable numbers.

## Website YAML — every rendered section

Clone structure from the latest `web/content/briefings/*.md`. Fill all of:

| Site | YAML |
|------|------|
| Hero | `marketTone`, `publishedAt` (set to dashboard `asOf` after inject) |
| Skim | `summary` (sourced), `signal`, `watch`; skim titles must match `themeCards[].title` |
| Themes | `themeCards` × 3–5: `id`, `title`, `grade`, `fact`, `factSources`, `mechanism`, `trigger`, `invalidator`, `horizon`, `status` |
| 市场一览 | `marketOverview` from inbox 市场一览 |
| Market closes | `marketDashboard` via inject only |
| Chart | `figures` (chart-of-day required if PNG exists) |
| Key sources | `keySources` |
| Event calendar | `eventCalendar` windowStart=briefing date, windowEnd=Friday after the Friday-on-or-after (this week + next); ~8–20 dated rows; mainland China only on calendar; `watchItems: []` |
| Global tab | `globalRegime`, `globalChanged`, `globalImplies`, `globalTensions` |
| China tab | `chinaStance`, `chinaChanged`, `chinaImplies`, `chinaDivergences` |
| Assets tab | `assetClasses` × 6 in order `us-equities` · `asia-equities` · `rates` · `fx` · `commodities` · `crypto` (asia = Golden Dragon/HK **and** JP/KR) |
| Sources tab | `sources`, `singleSource` |
| (not rendered) | `signals: []` |

## Publish

```bash
cd web
node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md
npm run verify-briefing
```

Commit md + JSON together. PR `[skip netlify] content: publish YYYY-MM-DD daily briefing`. Merge only when Briefing accuracy gate is green.

Self-check before PR: every table row above is non-empty; CICC attempted; China three desks or caveat; chart analysis describes the PNG; no invented tape.
---
