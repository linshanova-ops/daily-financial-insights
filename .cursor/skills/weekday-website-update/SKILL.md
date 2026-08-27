---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**09:00 is one publish from every source together.** Do not ship a 见闻-only tape and patch Bloomberg later. 财经早茶 is already in Gmail (~07:00–07:40). GH `inbox-sync.yml` fetches it at this same 09:00. This VM has no IMAP secrets; do not `gh workflow run`. If `INBOX_IMAP_USER` is set, fetch in this run (`node scripts/fetch-inbox-sources.mjs` — exists-keep, not a second copy).

Put `$TODAY` mail on disk **before YAML**, then gather the other desks in **this same run**:

```bash
git fetch origin main && git pull origin main
TODAY=$(TZ=Asia/Shanghai date +%F)
MAIL=web/content/inbox/bloomberg-markets-daily-china/$TODAY.md
# GH cron on 09:00 has been ~80 min late — wait so this run still unites, don't publish 见闻 and come back.
if [ -n "${INBOX_IMAP_USER:-}" ]; then (cd "$(git rev-parse --show-toplevel)" && node scripts/fetch-inbox-sources.mjs); fi
for i in $(seq 1 180); do test -f "$MAIL" && break; git pull origin main; sleep 30; done
# One wait. If still missing, name IMAP miss in singleSource — do not start another loop.
test -f "$MAIL"
```

Capture at this updating time (miss → name it in `singleSource`, do not substitute):

| Source | On the page |
|--------|-------------|
| 财经早茶 `$TODAY.md` + PNG | 市场一览, 今日图表, 国际要闻, 大中华, 日程 → Themes |
| 华尔街见闻 | China three-desk; extra prints **after** mail bullets |
| Caixin or 第一财经 | same |
| BlockBeats | Four books if the tape has them, on matching Themes: BTC/ETF/MSTR/stables/exchanges/reg; tech/AI chain; street ratings/targets; macro/CB/rates/FX/commodities. Name the desk. Never write CLAIM on the page. Skip meme/PnL/KOL targets. |
| CICC | Desk view on matching Themes (`CICC (date)：…`). Never write CLAIM. Not a What-changed print. |
| CNBC/AP + inject | closes in `marketDashboard` / summary FACT |

见闻「市场收报」is not 市场一览. Yesterday’s 财经早茶 is not today’s. Do not start a second agent/PR for `$TODAY`. Empty 今日图表 body ≠ no chart when the PNG exists. `$TODAY.md` on main is **not** done unless that whole set is mapped. If this leftover wrote a 见闻-only tape, **patch the same file**. Concurrent cap is 1. After live confirm, **stop/archive**. Keep the dashboard 09:00 automation **on**. `missed-briefing-catchup.yml` (09:30) may create only when `$TODAY.md` is absent.

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
2. Inbox: `$TODAY` 财经早茶 is on disk from the 09:00 wait (Monday: also `bloomberg-weekend-tea` if present). Map **that file** in the same pass as 见闻/CICC/prints. Do not merge yesterday’s 财经早茶 as today’s 市场一览. **今日图表** only if `inbox-charts/bloomberg-$TODAY.*` exists — never reuse yesterday’s PNG.
3. Inbox map (one pass — do not ship the figure then leave Themes/calendar on yesterday): 国际要闻 → `globalChanged` **Chinese, one bullet each, in mail order** (do not replace the mail with English primaries; extra prints can follow). 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` **Chinese, one bullet each, in mail order** (do not replace the mail with English books **or with 见闻「市场收报」**; do not add 加密/A股/欧洲股市 unless those labels are in the mail; do not retitle the site section 市场一览 — chrome is **Markets at a glance**). 日程/央行动态 → `eventCalendar`; 今日图表 → `figures` id `bloomberg-chart-of-day` **only** with `$TODAY` PNG. Then **rewrite `themeCards` from that same mail + prints**: one card per **independent** market force (count follows the tape — not a 3–5 cap). Include each large 市场一览 move that has its own mechanism (gold/bitcoin with duration is a Theme; oil on geopolitics is another). Merge cards that share a mechanism. Skip headlines that do not change a book. Bloomberg `www.bloomberg.com/asia` is a hub (403 in CI) — put distinctive sizes on a second source (见闻 / Treasury / AP) or drop the digit.
4. China minimum: in-window cite from **华尔街见闻**, **Caixin or 第一财经**, and **BlockBeats** — or name the miss in `singleSource`.
5. **CICC (required attempt):** theme-then-search via `cicc-research-article-search` (`APP_ID`/`APP_SECRET`; `python3 .cursor/skills/cicc-research-article-search/scripts/get_data.py "<theme>" --no-save`). Paraphrase only. Treat as a desk view, never a print. Write `CICC (date)：…` — do not write the word CLAIM. Put on matching `themeCards` / `globalImplies` — not as a What-changed print. Public cite = WeChat if that is what the skill returns. No VIP reprint. No invented notes. If env/search fails: say so in `singleSource`.

## FACT vs CLAIM (judgment)

- **FACT:** primary or triangulated print (BLS, AP close, Treasury, PR Newswire, Yicai OMO, Yahoo official index).
- **CLAIM:** inbox desk, third-party view, CICC, unverified size. Never promote a desk view to a close/print.
- **Do not write CLAIM on the website.** It is an agent gate, not a reader label. Name the desk (`财经早茶`, `律动`, `CICC`). Never `CLAIM — inbox` or `desk/CLAIM`. The source chip already says who said it.
- Beat/miss vs **estimate** only. `10亿元 = CNY1bn`. Crypto: two dated sources. Omit unverifiable numbers.

## Website YAML — every rendered section

Clone structure from the latest `web/content/briefings/*.md`. Fill all of:

| Site | YAML |
|------|------|
| Hero | `marketTone`, `publishedAt` (set to dashboard `asOf` after inject) |
| Skim | `summary` (sourced bullets), `signal`, `watch` — this is what the homepage shows first |
| Themes | `themeCards` — **one card per independent market force** from **today’s** 今日图表 + 市场一览 + 国际要闻/大中华 (plus FACT prints). Count follows the tape (quiet day can be 2; a busy 市场一览 can be 6+). Not a news digest, not a 3–5 quota, and not yesterday’s cards with one fact line patched. Title names the books it hits. Required: `assets[]`, `fact`, `factSources`, `mechanism`, `trigger`, `invalidator`, `horizon`, `status`. Site layout: Fact then So what, **full width, stacked** (not two columns); chips = `factSources` under Fact only. The page sorts STRONG → MODERATE → WEAK (YAML can stay tape order). Write `fact` as **one line per print**: `财经早茶 今日图表：the US Treasury General Account cash is above $900bn.` Cite and statement on the **same line** (YAML `: ` is fine; the site shows `：`). **One number once** — if AP already printed the S&P close, do not restate it from 市场一览; keep a second desk only when it adds a fact (seventh down day, Bessent by name). Never a stacked label, never a bare tape (`10-year 4.70%`, `Shanghai −0.59%`). So what (`mechanism`) is judgment on **this card’s books only**, in complete sentences; CICC as `CICC (date)：…`. Do not write “keep X on the other card” or “this is not the Y book.” Do not paste URLs or a chip list into the sentence. |
| Market closes | `marketDashboard` via inject only. Renders after Summary, **before** Markets at a glance and Themes. |
| Markets at a glance | `marketOverview` — fill from mail **市场一览**: **Chinese, one bullet each, in mail order**. Chrome (nav / h2 / hero) is English **Markets at a glance** — do not put 市场一览 on the page. Do not replace the 财经早茶 desk with English books. Extra dated prints live in Closes / Themes. Do not copy Yahoo inject levels into this paragraph. Do **not** fill `assetClasses`. |
| Chart | `figures` (chart-of-day **only** if `bloomberg-$TODAY` PNG exists). Renders after Markets at a glance, before Themes. |
| Key sources | `keySources` — **unique** prints/desk views only. Each row: `label`, `href`, `books[]` (asset-class ids it actually moves), `influence` (one line: the print and which book it changes). One href once. No Yahoo quote HTML. No second chip for a desk already used as the primary. |
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

**Themes:** one card per force that actually moves a book **today**. Count follows value, not a 3–5 cap — do not drop oil to make room for gold. Merge gold and bitcoin if they are the same duration/dollar beta; keep oil separate if the desk names geopolitics. Rewrite from this morning’s 财经早茶 — if 今日图表 is Hong Kong births, a Theme still titled as yesterday’s duration PNG is unpublished work. Mechanism answers “so what for which book.” Do not title cards as headline events if the value is the market transmission. Chip `themeId` on calendar rows to those new ids. The page sorts cards STRONG → MODERATE → WEAK; do not reorder YAML to match — tape order in the file is fine. **Write complete sentences.** A busy reader must follow `marketTone`, `summary`, `signal`, and Theme `title`/`fact`/`mechanism` without decoding keyword stitches such as “buyback-duration bounce” or “hike-if-inflation.” Name the actor, the action, and the number. Theme `fact` is stacked above So what (`mechanism`), full width — not two columns. Each Fact line is one line, cite then statement: `财经早茶 今日图表：the US Treasury General Account cash is above $900bn.` Never a stacked source label. Never a bare tape (`10-year 4.70%`, `Shanghai −0.59%`, `Nvidia −2.9%`). **Do not duplicate a print across desks** on the same card (CNBC 4.704% and Treasury 4.70% is one yield; AP S&P close and 市场一览 “the S&P fell” is one tape). Keep the primary; keep a desk line only if it adds a fact the primary does not have. Never write the word CLAIM on the page. So what is judgment in complete sentences, not fragments (`It did not.`), and stays on **this card’s books** — never “keep the chip selloff on the Nvidia card” or “this is not the TGA book.” Chips live in `factSources`, not in the prose.

**Bitcoin / Glassnode:** if `GLASSNODE_API_KEY` is set (or `gn` is logged in), `gn metric describe` then `gn metric get` for BTC before writing a gold/BTC theme (at least `market/price_usd_close`; add STH cost / realized P/L when credits allow). Date the print. Without the key, use the latest `web/content/inbox/glassnode-insights/` Week on Chain body only (desk view, window-date the email) — do not invent on-chain sizes. Product mail (“Using Glassnode With Agents”) is the CLI install (`gn` + `.cursor/skills/glassnode-cli`), not a Theme. If `gn` is missing: `curl -sSL https://raw.githubusercontent.com/glassnode/glassnode-cli/main/install.sh | bash`.

**Sources:** curate, don’t dump. A source is valuable if it is the primary print, the estimate for a beat/miss, or a desk view that actually moves a book. `factSources` / `driverSources` = that claim’s primary (plus estimate source if the sentence names a miss/beat). Do not clone `keySources` onto every card. Inbox hub once as a key source; per-bullet chips on What-changed are fine when that bullet is desk copy.

Self-check before PR: every **rendered** table row above is non-empty **except** omit `bloomberg-chart-of-day` when `$TODAY` PNG is missing; CICC attempted; China three desks or caveat; BlockBeats four books on matching Themes or the miss named in `singleSource`; if a chart is present its PNG date is `$TODAY`; Themes titles/facts match that chart and today’s desk (no Theme citing yesterday’s PNG as 今日图表); Theme `fact` lines are `Cite：complete statement` on one line (e.g. `财经早茶 今日图表：the US Treasury General Account…`), not a stacked label, not a bare print, and not the same close restated from a second desk; `marketOverview` is today’s mail 市场一览 (Chinese, mail order — not 见闻 市场收报), and the page title is **Markets at a glance**; prose is complete sentences (not keyword stitches); the word CLAIM does not appear in the briefing YAML; no invented tape; no duplicate `keySources` href; every key source has `books` + `influence`.

Do not record a walkthrough video.
---
