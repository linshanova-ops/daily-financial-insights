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
| Themes | `themeCards` — see **Theme card** below. `verify-briefing` fails the dump shape. |
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

## Theme card

One card = one force that moved a book today. Count follows the tape (2 on a quiet day, 6+ on a busy one). A reader should finish a card in 20 seconds and know what changed, why it matters for which books, and what dated print settles it.

```yaml
- id: german-cpi-energy
  title: German inflation is re-accelerating on energy      # the force, plain words, no tape
  grade: STRONG            # STRONG: primary print moved a named book today, dated next print inside the calendar window
                           # MODERATE: desk view, intraday tick, or the move has no dated settle yet
                           # WEAK: headline the books did not trade
  assets: [Bunds, EUR]     # 1–3 books this force actually moved
  fact: >-                 # 2–4 lines, `Cite: statement with the number.` Only prints this card's So what uses.
    Destatis: August flash CPI is +2.9% y/y after +2.8% in July, with energy +10.5%; finals are due 10 September.
    财经早茶 欧洲股债: Bunds fell for a sixth session as Middle East risk fed inflation worry.
  factSources:             # exactly the cites used above, ≤ 4 chips
    - { label: Destatis, href: ... }
    - { label: 彭博财经早茶 Sep 3, href: ... }
  mechanism: >-            # So what, 2–3 sentences: what the print means for the named books; the transmission; the dated next print.
    A second month of rising German inflation with energy up double digits keeps the ECB from following any Fed pause.
    Bunds price a hold or a hike in Berlin, so a Hormuz flare feeds straight into euro rates.
    The ECB decision on 10 September is the settle.
```

Rules the check enforces: fact ≤ 5 sentences, So what ≤ 4, chips 1–4, one number on one card only, grades not all identical. Rules the check cannot see: a print the So what does not use belongs in `globalChanged`/`chinaChanged`, not on the card (Bank of Canada is not on the yen card; Chevron Venezuela is not on the Hormuz card). So what is judgment for the reader — sourcing caveats (`not a settle`, `not the inject`, `not this card`) go to `singleSource`. No `trigger`/`invalidator`/`horizon`/`status` — the site does not render them; the dated next print is the last So what sentence. Merge cards that share one mechanism (gold and bitcoin on the same duration beta); keep oil separate when the desk names geopolitics. BlockBeats/CICC land on a card only when its So what uses them (`CICC (date): …`); otherwise `globalImplies`/`chinaImplies`. Chip `themeId` on calendar rows to the new ids. Never write CLAIM on the page. Complete sentences; name the actor, the action, and the number.

**Bitcoin / Glassnode:** if `GLASSNODE_API_KEY` is set (or `gn` is logged in), `gn metric describe` then `gn metric get` for BTC before writing a gold/BTC theme (at least `market/price_usd_close`; add STH cost / realized P/L when credits allow). Date the print. Without the key, use the latest `web/content/inbox/glassnode-insights/` Week on Chain body only (desk view, window-date the email) — do not invent on-chain sizes. Product mail (“Using Glassnode With Agents”) is the CLI install (`gn` + `.cursor/skills/glassnode-cli`), not a Theme. If `gn` is missing: `curl -sSL https://raw.githubusercontent.com/glassnode/glassnode-cli/main/install.sh | bash`.

**Sources:** curate, don’t dump. A source is valuable if it is the primary print, the estimate for a beat/miss, or a desk view that actually moves a book. `factSources` / `driverSources` = that claim’s primary (plus estimate source if the sentence names a miss/beat). Do not clone `keySources` onto every card. Inbox hub once as a key source; per-bullet chips on What-changed are fine when that bullet is desk copy.

Self-check before PR: every **rendered** table row above is non-empty **except** omit `bloomberg-chart-of-day` when `$TODAY` PNG is missing; CICC attempted; China three desks or caveat; BlockBeats four books on matching Themes or the miss named in `singleSource`; if a chart is present its PNG date is `$TODAY`; Themes titles/facts match that chart and today’s desk (no Theme citing yesterday’s PNG as 今日图表); every Theme fits the **Theme card** block above; `marketOverview` is today’s mail 市场一览 (Chinese, mail order — not 见闻 市场收报), and the page title is **Markets at a glance**; prose is complete sentences (not keyword stitches); the word CLAIM does not appear in the briefing YAML; no invented tape; no duplicate `keySources` href; every key source has `books` + `influence`.

Do not record a walkthrough video.
---
