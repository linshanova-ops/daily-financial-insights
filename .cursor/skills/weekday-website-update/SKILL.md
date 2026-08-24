---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC CLAIM, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**Preflight (before gather):** `git fetch origin main && git pull origin main`.

财经早茶 is in Gmail ~07:00–07:40. GH `inbox-sync.yml` fetches it at **08:00 Beijing** (one fetch — not also at 09:00). This VM has no IMAP secrets; do not `gh workflow run`.

**Block on `$TODAY` mail — then publish once.** Do not gather/YAML until `web/content/inbox/bloomberg-markets-daily-china/$TODAY.md` exists:

```bash
TODAY=$(TZ=Asia/Shanghai date +%F)
MAIL=web/content/inbox/bloomberg-markets-daily-china/$TODAY.md
for i in $(seq 1 40); do git pull origin main; test -f "$MAIL" && break; sleep 30; done
test -f "$MAIL"
```

Do **not** fill `marketOverview` from 见闻「市场收报」or from yesterday’s 财经早茶. Do **not** start a second agent, second briefing date, or second PR for `$TODAY`. Fetch-inbox already skips an existing daily file — do not re-fetch. Empty 今日图表 body ≠ no chart: if `inbox-charts/bloomberg-$TODAY.png` exists, add `figures`. `$TODAY.md` on main is **not** done unless that mail is mapped (PNG date = `$TODAY` or miss named; 市场一览 labels/lines in mail order; 国际要闻/大中华/日程; Themes rewritten from that mail). If this leftover already wrote a 见闻 tape, **patch the same file**. Concurrent cap is 1 — leftover RUNNING kills the 09:00 cron; this session then publishes. After live confirm, **stop/archive**. Keep the dashboard 09:00 automation **on**. Do not add a second Cursor cron. `missed-briefing-catchup.yml` (09:30) may create only when `$TODAY.md` is absent.

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
2. Inbox: the preflight wait must have `$TODAY` 财经早茶 on disk. Map **that file** (Monday: also `bloomberg-weekend-tea` if present). Do not merge yesterday’s 财经早茶 as today’s 市场一览. **今日图表** (`figures` id `bloomberg-chart-of-day`) only if `inbox-charts/bloomberg-$TODAY.*` exists — never reuse yesterday’s PNG; omit and name the miss. If IMAP env exists (Actions only), `node scripts/fetch-inbox-sources.mjs` is idempotent (exists-keep).
3. Inbox map (one pass — do not ship the figure then leave Themes/calendar on yesterday): 国际要闻 → `globalChanged` **Chinese, one bullet each, in mail order** (do not replace the mail with English primaries; extra prints can follow). 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` **Chinese, one bullet each, in mail order** (do not replace the mail with English books **or with 见闻「市场收报」**; do not add 加密/A股/欧洲股市 unless those labels are in the mail; do not retitle the site section 市场一览 — chrome is **Markets at a glance**). 日程/央行动态 → `eventCalendar`; 今日图表 → `figures` id `bloomberg-chart-of-day` **only** with `$TODAY` PNG. Then **rewrite `themeCards` from that same mail + prints**: one card per **independent** market force (count follows the tape — not a 3–5 cap). Include each large 市场一览 move that has its own mechanism (gold/bitcoin with duration is a Theme; oil on geopolitics is another). Merge cards that share a mechanism. Skip headlines that do not change a book. Bloomberg `www.bloomberg.com/asia` is a hub (403 in CI) — put distinctive sizes on a second source (见闻 / Treasury / AP) or drop the digit.
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
| Skim | `summary` (sourced bullets), `signal`, `watch` — this is what the homepage shows first |
| Themes | `themeCards` — **one card per independent market force** from **today’s** 今日图表 + 市场一览 + 国际要闻/大中华 (plus FACT prints). Count follows the tape (quiet day can be 2; a busy 市场一览 can be 6+). Not a news digest, not a 3–5 quota, and not yesterday’s cards with one fact line patched. Title names the books it hits. Required: `assets[]`, `fact`, `factSources`, `mechanism`, `trigger`, `invalidator`, `horizon`, `status` |
| Market closes | `marketDashboard` via inject only. Renders after Summary, **before** Markets at a glance and Themes. |
| Markets at a glance | `marketOverview` — fill from mail **市场一览**: **Chinese, one bullet each, in mail order**. Chrome (nav / h2 / hero) is English **Markets at a glance** — do not put 市场一览 on the page. Do not replace the 财经早茶 desk with English books. Extra dated prints live in Closes / Themes. Do not copy Yahoo inject levels into this paragraph. Do **not** fill `assetClasses`. |
| Chart | `figures` (chart-of-day **only** if `bloomberg-$TODAY` PNG exists). Renders after Markets at a glance, before Themes. |
| Key sources | `keySources` — **unique** prints/CLAIMs only. Each row: `label`, `href`, `books[]` (asset-class ids it actually moves), `influence` (one line: the print and which book it changes). One href once. No Yahoo quote HTML. No second chip for a desk already used as the primary. |
| Event calendar | `eventCalendar` windowStart=briefing date, windowEnd=Friday after the Friday-on-or-after (this week + next); ~8–20 dated rows; mainland China only on calendar; `watchItems: []` |
| Global | `globalRegime`, `globalChanged`, `globalImplies`, `globalTensions` |
| China | `chinaStance`, `chinaChanged`, `chinaImplies`, `chinaDivergences` |
| Sources | Renders `keySources` classified by book. `sources` = leftovers cited only on What-changed. `singleSource` = caveats. |
| (not rendered) | `signals: []`. `assetClasses` / `assetFramework` — do **not** spend the run filling six books; the site does not show them. |

## Publish

```bash
cd web
node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md
npm run verify-briefing
```

Commit md + JSON together. PR `[skip netlify] content: publish YYYY-MM-DD daily briefing` — mark **ready**, not draft.

Wait for **Briefing accuracy gate**. When green: merge to `main` (`gh pr merge` or `git checkout main && git merge && git push origin main` if `gh` is 403). Push to `main` fires Pages; if `latest.json` on Pages is still yesterday, dispatch **Deploy syravocado to GitHub Pages**. Confirm live `…/data/latest.json` `date` is `$TODAY`, then stop.

**Themes:** one card per force that actually moves a book **today**. Count follows value, not a 3–5 cap — do not drop oil to make room for gold. Merge gold and bitcoin if they are the same duration/dollar beta; keep oil separate if the desk names geopolitics. Rewrite from this morning’s 财经早茶 — if 今日图表 is Hong Kong births, a Theme still titled as yesterday’s duration PNG is unpublished work. Mechanism answers “so what for which book.” Do not title cards as headline events if the value is the market transmission. Chip `themeId` on calendar rows to those new ids. **Write complete sentences.** A busy reader must follow `marketTone`, `summary`, `signal`, and Theme `title`/`fact`/`mechanism` without decoding keyword stitches such as “buyback-duration bounce” or “hike-if-inflation.” Name the actor, the action, and the number.

**Sources:** curate, don’t dump. A source is valuable if it is the primary print, the estimate for a beat/miss, or a labeled CLAIM that actually moves a book. `factSources` / `driverSources` = that claim’s primary (plus estimate source if the sentence names a miss/beat). Do not clone `keySources` onto every card. Inbox hub once as a key source; per-bullet chips on What-changed are fine when that bullet is desk/CLAIM.

Self-check before PR: every **rendered** table row above is non-empty **except** omit `bloomberg-chart-of-day` when `$TODAY` PNG is missing; CICC attempted; China three desks or caveat; if a chart is present its PNG date is `$TODAY`; Themes titles/facts match that chart and today’s desk (no Theme citing yesterday’s PNG as 今日图表); `marketOverview` is today’s mail 市场一览 (Chinese, mail order — not 见闻 市场收报), and the page title is **Markets at a glance**; prose is complete sentences (not keyword stitches); no invented tape; no duplicate `keySources` href; every key source has `books` + `influence`.

Do not record a walkthrough video.
---
