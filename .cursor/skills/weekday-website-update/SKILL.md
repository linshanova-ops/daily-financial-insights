---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC CLAIM, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**Preflight (before gather):** `git fetch origin main` then `git pull origin main` so 09:00 IMAP is on disk. If `bloomberg-$TODAY.md` or `inbox-charts/bloomberg-$TODAY.*` is missing, wait 30s and pull again (up to 2 min) — IMAP often lands on `main` a minute after this run starts. `$TODAY.md` on main is **not** done. Stop only if **all** of these already match today’s 财经早茶: 今日图表 PNG date = `$TODAY` (or omitted with the miss named); `marketOverview` is that mail’s 市场一览 (not yesterday’s tape); 国际要闻/大中华/日程 are in What-changed + calendar; **Themes rewritten from that same mail** (titles/facts do not still name yesterday’s PNG or yesterday’s desk color). Empty 今日图表 body ≠ no chart: if `bloomberg-$TODAY.png` exists, open it and add `figures`. If the file exists but any of those still look like yesterday: **patch**, including a Theme rewrite — do not stop. Concurrent cap is 1 — a leftover RUNNING desktop/chat agent **kills** the 09:00 Cursor automation (`rate-limited due to too many concurrent runs`). If this run is still open after 09:00, **this session publishes or patches**. After live confirm, **stop/archive** so tomorrow’s 09:00 can fire. Keep the Cursor dashboard 09:00 automation **on**. GH `inbox-sync.yml` fetches IMAP at **09:00 Beijing** (same minute) and **sends** only if a leftover holds the cap (`CATCHUP_CREATE=0` — never `Agent.create` at 09:00). If 09:00 missed, `missed-briefing-catchup.yml` (09:30) may create.

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
2. Inbox: `git pull origin main` then `web/content/inbox/`. GH `inbox-sync.yml` fetches IMAP at **09:00 Beijing** (same minute as this automation — not 06:00/07:20). This VM has no IMAP secrets; `gh workflow run` is 403 — do not use it. If `bloomberg-$TODAY.md` is missing, wait 30s and pull again (up to 2 min). If IMAP env exists, also run `node scripts/fetch-inbox-sources.mjs`. Merge **latest** `bloomberg-markets-daily-china/*.md` on or before `$TODAY` for desk copy (Monday: also `bloomberg-weekend-tea`). Missing today's file ≠ no Bloomberg for 市场一览. **今日图表** (`figures` id `bloomberg-chart-of-day`) only if `inbox-charts/bloomberg-$TODAY.*` exists — never reuse yesterday’s PNG as today’s figure; omit and name the miss.
3. Inbox map (one pass — do not ship the figure then leave Themes/calendar on yesterday): 国际要闻 → `globalChanged` (Chinese, one bullet each); 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` (desk copy, never invent from Yahoo); 日程/央行动态 → `eventCalendar` (FOMC 2pm ET = 02:00 Beijing next day); 今日图表 → `figures` id `bloomberg-chart-of-day` **only** with `$TODAY` PNG (open it; analysis names the metric/levels). Then **rewrite `themeCards` from that same mail + prints** — titles, facts, mechanisms; skim `signal` titles = new Theme titles. Omit the figure if that file is missing. Do not ship a public-tape 市场一览 in place of the desk. Bloomberg `www.bloomberg.com/asia` is a hub (403 in CI) — do not put unverifiable consensus or desk-only sizes on a claim that cites only that hub.
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
| Themes | `themeCards` × 3–5 **cross-asset forces** from **today’s** 今日图表 + 市场一览 + 国际要闻/大中华 (plus FACT prints). Not a news digest and not yesterday’s cards with one fact line patched. Title names the books it hits. Required: `assets[]`, `fact`, `factSources`, `mechanism`, `trigger`, `invalidator`, `horizon`, `status` |
| 市场一览 | `marketOverview` from inbox 市场一览 |
| Market closes | `marketDashboard` via inject only |
| Chart | `figures` (chart-of-day **only** if `bloomberg-$TODAY` PNG exists) |
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

**Themes:** pick the 3–5 forces that actually move asset markets **today**. Rewrite from this morning’s 财经早茶 — if 今日图表 is Hong Kong births, a Theme still titled as yesterday’s duration PNG is unpublished work. Mechanism answers “so what for which book.” Do not title cards as headline events if the value is the market transmission. Chip `themeId` on Assets to those new ids. **Write complete sentences.** A busy reader must follow `marketTone`, `signal`, Theme `title`/`fact`/`mechanism`, and Assets `regime`/`driver`/`read` without decoding keyword stitches such as “buyback-duration bounce” or “hike-if-inflation.” Name the actor, the action, and the number.

**Assets:** `regime` names the current beta. `driver` = sourced print or labeled CLAIM/desk — never “see Market Dashboard” as the whole story. `read` = the perspective (what it means, next falsifier). `invalidator` when the book is live. Quiet class: one honest line, don’t pad. `themeId` chips to Themes. Levels/live tape stay in `marketDashboard` (Yahoo quote HTML is not a close).

**Sources:** curate, don’t dump. A source is valuable if it is the primary print, the estimate for a beat/miss, or a labeled CLAIM that actually moves a book. `factSources` / `driverSources` = that claim’s primary (plus estimate source if the sentence names a miss/beat). Do not clone `keySources` onto every card. Inbox hub once as a key source; per-bullet chips on What-changed are fine when that bullet is desk/CLAIM.

Self-check before PR: every table row above is non-empty **except** omit `bloomberg-chart-of-day` when `$TODAY` PNG is missing; CICC attempted; China three desks or caveat; if a chart is present its PNG date is `$TODAY`; Themes titles/facts match that chart and today’s desk (no Theme citing yesterday’s PNG as 今日图表); 市场一览 is today’s mail, not yesterday’s; prose is complete sentences (not keyword stitches); no invented tape; no Assets row whose only content is “see Market Dashboard”; no duplicate `keySources` href; every key source has `books` + `influence`.

Do not record a walkthrough video.
---
