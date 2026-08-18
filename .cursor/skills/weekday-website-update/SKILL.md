---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC CLAIM, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**Preflight (before gather):** `git fetch origin main`. If `web/content/briefings/$TODAY.md` is already on `origin/main`, stop. Concurrent cap is 1 — a leftover RUNNING desktop/chat agent **kills** the 09:00 cron (`rate-limited due to too many concurrent runs`). If this run is still open after 09:00 and `$TODAY.md` is missing, **this session publishes** (do not wait for a cron that already died). After live confirm, **stop/archive** so tomorrow’s 09:00 can fire. If 09:00 missed, GH `missed-briefing-catchup.yml` (09:30 Beijing) archives a leftover and starts one weekday run.

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
2. Inbox: `git pull origin main` then `web/content/inbox/`. GH `inbox-sync.yml` fetches IMAP at **06:00 Beijing** onto `main` (this VM has no IMAP secrets; `gh workflow run` is 403 — do not use it). If IMAP env exists, also run `node scripts/fetch-inbox-sources.mjs`. Merge **latest** `bloomberg-markets-daily-china/*.md` on or before `$TODAY` (Monday: also `bloomberg-weekend-tea`). Missing today's file ≠ no Bloomberg.
3. Inbox map: 国际要闻 → `globalChanged` (Chinese, one bullet each); 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` (desk copy, never invent from Yahoo); 日程/央行动态 → `eventCalendar`; 今日图表 → `figures` id `bloomberg-chart-of-day` (open the PNG; analysis must name the metric/levels). Do not ship a public-tape 市场一览 in place of the desk.
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
| Skim | `summary` (sourced), `signal`, `watch`; skim titles = `themeCards[].title` |
| Themes | `themeCards` × 3–5 **cross-asset forces** (not a news digest). Title names the books it hits. Required: `assets[]`, `fact`, `factSources`, `mechanism` (how it transmits to those classes), `trigger`, `invalidator`, `horizon`, `status` |
| 市场一览 | `marketOverview` from inbox 市场一览 |
| Market closes | `marketDashboard` via inject only |
| Chart | `figures` (chart-of-day required if PNG exists) |
| Key sources | `keySources` — **unique** prints/CLAIMs only. Each row: `label`, `href`, `books[]` (asset-class ids it actually moves), `influence` (one line: the print and which book it changes). One href once. No Yahoo quote HTML. No second chip for a desk already used as the primary. |
| Event calendar | `eventCalendar` windowStart=briefing date, windowEnd=Friday after the Friday-on-or-after (this week + next); ~8–20 dated rows; mainland China only on calendar; `watchItems: []` |
| Global tab | `globalRegime`, `globalChanged`, `globalImplies`, `globalTensions` |
| China tab | `chinaStance`, `chinaChanged`, `chinaImplies`, `chinaDivergences` |
| Assets tab | `assetClasses` × 6 in order `us-equities` · `asia-equities` · `rates` · `fx` · `commodities` · `crypto` (asia = Golden Dragon/HK **and** JP/KR). This is the valuable book-by-book view — not a pointer at the dashboard. |
| Sources tab | Renders `keySources` classified by book. `sources` = leftovers cited only on What-changed. `singleSource` = caveats. |
| (not rendered) | `signals: []` |

## Publish

```bash
cd web
node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md
npm run verify-briefing
```

Commit md + JSON together. PR `[skip netlify] content: publish YYYY-MM-DD daily briefing` — mark **ready**, not draft.

Wait for **Briefing accuracy gate**. When green: merge to `main` (`gh pr merge` or `git checkout main && git merge && git push origin main` if `gh` is 403). Push to `main` fires Pages; if `latest.json` on Pages is still yesterday, dispatch **Deploy syravocado to GitHub Pages**. Confirm live `…/data/latest.json` `date` is `$TODAY`, then stop.

**Themes:** pick the 3–5 forces that actually move asset markets today. Mechanism answers “so what for which book.” Do not title cards as headline events if the value is the market transmission.

**Assets:** `regime` names the current beta. `driver` = sourced print or labeled CLAIM/desk — never “see Market Dashboard” as the whole story. `read` = the perspective (what it means, next falsifier). `invalidator` when the book is live. Quiet class: one honest line, don’t pad. `themeId` chips to Themes. Levels/live tape stay in `marketDashboard` (Yahoo quote HTML is not a close).

**Sources:** curate, don’t dump. A source is valuable if it is the primary print, the estimate for a beat/miss, or a labeled CLAIM that actually moves a book. `factSources` / `driverSources` = that claim’s primary (plus estimate source if the sentence names a miss/beat). Do not clone `keySources` onto every card. Inbox hub once as a key source; per-bullet chips on What-changed are fine when that bullet is desk/CLAIM.

Self-check before PR: every table row above is non-empty; CICC attempted; China three desks or caveat; chart analysis describes the PNG; no invented tape; no Assets row whose only content is “see Market Dashboard”; no duplicate `keySources` href; every key source has `books` + `influence`.

Do not record a walkthrough video.
---
