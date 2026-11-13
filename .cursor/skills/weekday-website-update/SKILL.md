---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Same quality as a manual publish — full pipeline, CICC, every site section.
---

# Weekday website update

One cloud-agent run. Do **not** call `scripts/generate-daily-briefing.mjs` or spawn extra agents.

If Asia/Shanghai is Sat/Sun: stop.

**09:00 is one publish from every source together.** Do not ship a 见闻-only tape and patch Bloomberg later. 财经早茶 is already in Gmail (~07:00–07:40). Last-kick `inbox-sync.yml` now — that on.push is the IMAP clock. Do not wait for GH `schedule` (~13:30). This VM has no IMAP secrets; do not `gh workflow run`. If `INBOX_IMAP_USER` is set, fetch in this run (`node scripts/fetch-inbox-sources.mjs` — exists-keep, not a second copy).

Last-kick at job start, then start 见闻/Caixin/BlockBeats/CICC **immediately** (IMAP is ~20s — do not serialize desks behind the mail wait). Put `$TODAY` mail on disk **before YAML**:

```bash
git fetch origin main && git pull origin main
TODAY=$(TZ=Asia/Shanghai date +%F)
MAIL=web/content/inbox/bloomberg-markets-daily-china/$TODAY.md
if [ -n "${INBOX_IMAP_USER:-}" ]; then (cd "$(git rev-parse --show-toplevel)" && node scripts/fetch-inbox-sources.mjs); fi
# Last-kick is the 09:00 mail clock. Always bump `# last-kick:` at job start, commit, push (on.push = same job).
# GH schedule fires ~13:30 — do not wait for it. Do not wait 180×30s.
sed -i "s/^# last-kick:.*/# last-kick: $(date -u +%Y-%m-%dT%H:%MZ) 09:00 IMAP/" .github/workflows/inbox-sync.yml
git add .github/workflows/inbox-sync.yml
git commit -m "chore: last-kick IMAP at 09:00"
git push
for i in $(seq 1 12); do test -f "$MAIL" && break; git pull; sleep 10; done
# If still missing, stop. Do not write singleSource. Do not start a 90-min loop.
test -f "$MAIL"
```

Capture at this updating time (miss → do not substitute, and do not write `singleSource`):

| Source | On the page |
|--------|-------------|
| 财经早茶 `$TODAY.md` + PNG | 市场一览, 今日图表, 国际要闻, 大中华, 日程 → Themes |
| 华尔街见闻 | China three-desk; extra prints **after** mail bullets |
| Caixin or 第一财经 | same |
| BlockBeats | Four books if the tape has them, on matching Themes: BTC/ETF/MSTR/stables/exchanges/reg; tech/AI chain; street ratings/targets; macro/CB/rates/FX/commodities. Name the desk. Never write CLAIM on the page. Skip meme/PnL/KOL targets. |
| CICC | Desk view on matching Themes (`CICC (date)：…`). Never write CLAIM. Not a What-changed print. |
| CNBC/AP + inject | closes in `marketDashboard` / summary FACT |

见闻「市场收报」is not 市场一览. Yesterday’s 财经早茶 is not today’s. Do not start a second agent/PR for `$TODAY`. Empty 今日图表 body ≠ no chart when the PNG exists. Open the PNG first. Title and analysis describe that image (series, units, what it shows). Never use an adjacent news bullet as the chart write-up. If the 今日图表 body is empty, title and analysis come only from the opened PNG; do not reuse the neighboring section’s topic (30 Sep: consumer confidence on the USDA soy chart). `$TODAY.md` on main is **not** done unless that whole set is mapped. If this leftover wrote a 见闻-only tape, **patch the same file**. Concurrent cap is 1. After live confirm, **stop/archive**. Keep the dashboard 09:00 automation **on**. `missed-briefing-catchup.yml` (09:30) may create only when `$TODAY.md` is absent.

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
2. Inbox: `$TODAY` 财经早茶 is on disk from the 09:00 last-kick (Monday: also `bloomberg-weekend-tea` if present). Map **that file** in the same pass as 见闻/CICC/prints. Do not merge yesterday’s 财经早茶 as today’s 市场一览. **今日图表** only if `inbox-charts/bloomberg-$TODAY.*` exists — never reuse yesterday’s PNG.
3. Inbox map (one pass — do not ship the figure then leave Themes/calendar on yesterday): 国际要闻 → `globalChanged` **Chinese, one bullet each, in mail order** (do not replace the mail with English primaries; extra prints can follow). 大中华 → `chinaChanged`; 市场一览 → `marketOverview.items` **Chinese, one bullet each, in mail order** (do not replace the mail with English books **or with 见闻「市场收报」**; do not add 加密/A股/欧洲股市 unless those labels are in the mail; English section title stays **Markets at a glance** (中文 市场一览)). 日程/央行动态 → `eventCalendar`; 今日图表 → `figures` id `bloomberg-chart-of-day` **only** with `$TODAY` PNG. Then **rewrite `themeCards` from that same mail + prints**: one card per **independent** market force (count follows the tape — not a 3–5 cap). Include each large 市场一览 move that has its own mechanism (gold/bitcoin with duration is a Theme; oil on geopolitics is another). Merge cards that share a mechanism. Skip headlines that do not change a book. Bloomberg `www.bloomberg.com/asia` is a hub (403 in CI) — put distinctive sizes on a second source (见闻 / Treasury / AP) or drop the digit.
4. China minimum: in-window cite from **华尔街见闻**, **Caixin or 第一财经**, and **BlockBeats**. If one is missing, leave it off the page. Do not write `singleSource`.
5. **CICC (required attempt):** theme-then-search via `cicc-research-article-search` (`APP_ID`/`APP_SECRET`; `python3 .cursor/skills/cicc-research-article-search/scripts/get_data.py "<theme>" --no-save`). Paraphrase only. Treat as a desk view, never a print. Write `CICC (date)：…` — do not write the word CLAIM. Put on matching `themeCards` / `globalImplies` — not as a What-changed print. Public cite = WeChat if that is what the skill returns. No VIP reprint. No invented notes. If env/search fails: skip that note. Do not write `singleSource`.

## FACT vs CLAIM (judgment)

- **FACT:** primary or triangulated print (BLS, AP close, Treasury, PR Newswire, Yicai OMO, Yahoo official index).
- **CLAIM:** inbox desk, third-party view, CICC, unverified size. Never promote a desk view to a close/print.
- **Do not write CLAIM on the website.** It is an agent gate, not a reader label. Name the desk (`财经早茶`, `律动`, `CICC`). Never `CLAIM — inbox` or `desk/CLAIM`. The source chip already says who said it. No workflow ids in published copy (`.yml`, inbox-sync, last-kick, branch names).
- Beat/miss vs **estimate** only. `10亿元 = CNY1bn`. Crypto: two dated sources. Omit unverifiable numbers.
- `docs/CONTENT_ACCURACY.md` rules 12–16 apply to every issue: deal size vs net proceeds, labeled snapshot quotes, calendar `timing`, named comparisons, sources beside numbers, and silent post-publish fixes.

## Both languages

Every reader-facing sentence in the YAML is `{ en, zh }`. No side translation file. `en` is an English sentence. `zh` is a Chinese sentence. A source name stays the publication’s own name (华尔街见闻, 财新, 第一财经, 律动, CNBC, CICC, Yahoo); the sentence around it is in that language. `verify-briefing` fails the latest file if a rendered sentence is missing either side.

English page source names and chip topic tails go through the map in `web/scripts/lib/reader-shorthand.mjs`. The Chinese page keeps the Chinese labels. Add a missing pair there instead of hardcoding a one-off string.

Both sides state the same facts: a number, date, name, direction, or story matches. Do not translate a figure into a different fact. Do not invent numbers, closes, or dates.

Header: 中文 is `?lang=zh`; English is the default URL. The whole reader-facing page is that language, in desk prose. Do not leave the other language’s sentences on the page. Intro, judgements, themes, watch, mapped closes labels, and chips are written in that language as a reader would say them, same facts, not a word-for-word translation: plain Chinese on the Chinese page, plain English on the English page, no calques.

Voice, in reader sentences:

- Write the move (“stocks rose, crude prices fell”). Do not write “the market bought” or “the market sold” unless those trades happened.
- A price change is not a flow, a position, or a motive. An inflow is not a purchase.
- Do not turn two events that happened together into a cause.
- Name bond yields or bond prices. Do not write “the short end rose” alone.
- For an exchange rate, name the pair and which currency rose.
- Use “exposure” only for a real holding or a risk sensitivity, not an index level.
- Replace tape, book, print, bid, path, and story with the market, indicator, price, or event, unless that word is the technical term.
- Do not write “the later profit path”, “at the same clock”, “about-reads”, “the copper book”, or “the hike case is still in the two-year”.
- Name the market (US stocks, A-shares, the index). Do not widen it to global markets.
- Do not write 自己在跌, 认购很满, 压力会凉下来, 这一头, 那笔, or 篮子.
- For the yuan, do not use 站上 or 跌破 in a way that flips which currency strengthened.
- A headline names the development, not a bar’s shape.
- Say whether a figure is a release, a forecast, or an approximate chart reading.
- A source’s new wording is not a market change.
- Compare an old price with the date, not “Thursday’s level”.
- Attribute with “X reported”. Do not say a source printed the number.
- When the company changes, name it again. Keep a share move separate from another company's fundraising and founder share sales, and say whether the amount is an IPO, a private placement, or both.
- An IPO headline says total deal size and what it includes (holders' sale, placement); the body gives net proceeds to the company from the filing, with the basis (midpoint, top of range, before the overallotment option). Chinese: 交易总规模 / 公司净募资 / 老股出售; English: total deal size / net proceeds to the company.
- Name the comparison: prior period, a year earlier, or the forecast. “Above expectations” states the reading and the forecast, plus the prior reading when it moved the other way. Conditional judgments say “could” / “若…可能” (例：若美伊谈判破裂，油价可能反弹).
- A fund-flow line gives the flow date, the net amount, and the source. Do not turn a net flow into a holdings change without holdings data.
- A claim that a price level broke uses the same contract, or a named continuous series. If the contracts differ, report each price on its own.
- “Above expectations” states the reading and the forecast. Write export growth as a pace. Separate talks from easing tensions.
- The intro is one or two sentences on the day's main line. Levels and full percentage changes stay in the summary or the Market snapshot.
- A chart title names the region, the indicator, and the finding.
- Delete a sentence whose only point is that the next session the other way ends the move.

Market snapshot (行情快照; was Market closes): `?lang=zh` uses the shared `assetZh` map; the default page keeps the English names. Brent row stays Yahoo `BZ=F`, Chinese label 布伦特期货（Yahoo）. Not Platts. Do not label an unfinished session as a daily close. Mark it 盘中 / intraday with the quote time. Use the latest completed session the feed actually has. A holiday is the previous-session close plus the holiday. A print older than that latest session is stale, with the missing date. Do not show a stale price with no marker, and do not invent a backup price. Nikkei and Kospi show the prior completed close. Tokyo cash close is 15:30 (Seoul cash close is 15:30). Do not mark that completed close missing or a holiday. The page tags each row with its print date plus one short quote type from its id ("11月12日 收盘", "11月13日 盘中 09:31", official yield, 24h, funding; dates come from `asOfDate` / the snapshot's Beijing date, never typed by hand) and the `contract` month inline when the inject found it; never type a contract month by hand. Every `printNote` renders in one numbered footnote block under the snapshot; row `source` links and the snapshot `note` are kept in the data but not shown on the site. After the final inject, add a `printNote` `{ en, zh }` on any row whose asset the text quotes from another source (a COMEX settle vs Yahoo intraday, a desk's market-close yield vs the Treasury curve), and a clause beside that number in the text.

- At the 09:25 Beijing snapshot the Yahoo chart can list the next session’s open bar and omit the finished 15:30 Tokyo/Seoul close. That close is fulldayPrice minus fulldayChange in the same payload. Insert that one finished weekday. Do not keep Friday, and do not stamp the row missing or a holiday.

Chinese uses 万/亿. English uses million/billion and a number such as 86,000. Never write "hundred million", 亿元, or "ten thousand" in English. Taiwan equity flow is in New Taiwan dollars. Do not repeat the other language's number in parentheses. One sentence keeps one scale.

English amounts use only thousand, million, billion, or trillion. Chinese amounts use only 个, 百, 千, 万, or 亿, at the scale a reader would say (20万, not 200千; 65 thousand, not “6.5 in ten thousands”).

A price move names the session (cash close, intraday, or after hours). Do not invent a clock time. US October payrolls are 21:30 Beijing. Do not write 待确认 once that clock is known.

The greeting under the avocado stays on both pages. Do not remove either line. Do not fade them. English: Welcome to syravocado — hope you enjoy today’s brief. Chinese: 欢迎你来到小果，希望你喜欢今天的简报！

LangSwitch observes `document.body` only. Do not observe `documentElement` or `<html>`, and do not add another observer. The title script rewrites `<title>` on `data-lang`; a childList watch under `<html>` retriggers forever and freezes the tab. The tab and share title is one short line. `?lang=zh` keeping the English `<title>` until a click is accepted. Reader-facing copy says the edition publishes at 09:30 Beijing.

## Website YAML — every rendered section

Clone structure from the latest `web/content/briefings/*.md`. Fill all of:

| Site | YAML |
|------|------|
| Hero | `marketTone`, `publishedAt` (set to dashboard `asOf` after inject; never moved later). A post-publish fix to a number, event time, or attribution corrects the content in place: no updated time, no correction note. The intro’s first sentence has a subject: English “US stocks fell…”, Chinese “美股下跌…”. |
| Skim | `summary` (sourced bullets), `signal`, `watch` — this is what the homepage shows first |
| Themes | `themeCards` — see **Theme card** below. `verify-briefing` fails the dump shape. |
| Market snapshot | `marketDashboard` via inject only, plus `printNote` on rows the text quotes from another source. Renders after Summary, **before** Markets at a glance and Themes. |
| Markets at a glance | `marketOverview` — fill from mail **市场一览**: **Chinese, one bullet each, in mail order**. Section title follows the page language (Markets at a glance / 市场一览). Do not replace the 财经早茶 desk with English books. Extra dated prints live in Market snapshot / Themes. Do not copy Yahoo inject levels into this paragraph. Do **not** fill `assetClasses`. |
| Chart | `figures` (chart-of-day **only** if `bloomberg-$TODAY` PNG exists). Open the PNG first; title and analysis describe that image (series, units, what it shows). Read the latest point on the opened PNG. An image read is 约 / about unless a data file confirms it. Never an adjacent news bullet. Renders after Markets at a glance, before Themes. When an official release gives the chart's numbers (Eurostat, BLS, NBS), state them in the analysis and add that link to `figures[].sources` beside the mail. If that PNG is not English, set `imageSrcEn` to `bloomberg-$TODAY-en.png` (same bars and numbers; English title, axes, legend, and source); `?lang=zh` keeps `imageSrc`. |
| Key sources | `keySources` — **unique** prints/desk views only. Each row: `label`, `href`, `books[]` (asset-class ids it actually moves), `influence` (one line: the print and which book it changes). One href once. No Yahoo quote HTML. No second chip for a desk already used as the primary. |
| Event calendar | `eventCalendar` windowStart=briefing date, windowEnd=Friday after the Friday-on-or-after (this week + next); ~8–20 dated rows; mainland China only on calendar; `watchItems: []`. A row without `timeBeijing` sets `timing`: `all-day` (holiday, closure, effective date), `tbd` (time not set), or `unconfirmed` (event not confirmed). The page hides rows timed before `publishedAt` (no past label), so put an event that already happened in the text, not the calendar. |
| Global | `globalRegime`, `globalChanged`, `globalImplies`, `globalTensions` — **do not repeat Market snapshot prints** (indices, yields, oil settle, BTC level). Keep narrative and desk news; extra AP/Treasury close bullets belong in `marketDashboard` / Themes / skim `summary`, not `globalChanged`. |
| China | `chinaStance`, `chinaChanged`, `chinaImplies`, `chinaDivergences` — same rule: no second A/H index close table in What changed; stance is policy and flows, not re-listing Shanghai/Hang Seng levels already in Market snapshot. |
| Sources | Renders `keySources` classified by book. `sources` = leftovers cited only on What-changed. Do not write `singleSource`. The page does not show a single-source risk block. |
| (not rendered) | `signals: []`. `assetClasses` / `assetFramework` — do **not** spend the run filling six books; the site does not show them. |

## Publish

```bash
cd web
node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md
SCAN_LINKS_SKIP_FETCH=1 npm run verify-briefing
```

Commit md + JSON together. PR `[skip netlify] content: publish YYYY-MM-DD daily briefing` — mark **ready**, not draft.

Wait for **Briefing accuracy gate**. When green: merge to `main` (`gh pr merge` or `git checkout main && git merge && git push origin main` if `gh` is 403). Push to `main` fires Pages; if `latest.json` on Pages is still yesterday, dispatch **Deploy syravocado to GitHub Pages**. Confirm live `…/data/latest.json` `date` is `$TODAY`, then write the daily post below and stop.

## Daily post (not on the website)

After the live check, write one plain-text Chinese post of 200–300 Chinese characters (count them; punctuation, digits and Latin letters do not count) from `$TODAY`'s published briefing, under a title of at most 15 Chinese characters: serious but eye-catching and a little fun, grounded in that day's facts (no clickbait, no invented claim). Use only facts and numbers already on the page; add no new claim, number, or source. Open with a few sentences of key takeaways: the market tone and two or three of the biggest moves or themes. End by prompting readers to notice their own emotions and behavioral leanings after reading, using questions or a self-check (e.g. 你现在更焦虑还是更平静？更想马上操作，还是想再等等？). Do not give trading advice or tell readers to buy, sell or hold. No markdown, hashtags or emoji; a site link only if it reads naturally. Do not put it in the briefing YAML or anywhere on the site. Do not save it anywhere (no store file, no repo file); put the title and text only in the run's final reply.

## Theme card

One card = one force. Count follows the tape. A reader finishes a card in 20 seconds: the logic, one external view inside it, and which of this card's books it moves. The date/time of the next print belongs in `eventCalendar` and the skim `watch` string — never in `mechanism`. The skim `watch` string keeps about five next items, not the whole calendar. Do not end So what with the dated next print. Do not end So what with a conditional falsifier (“If …, this …” / “若…，这次…”).

So what (`mechanism`) is 2–4 sentences, no preamble, in this order:

1. Judgment — the logic the tape implies. Do not restate Fact, Summary, Markets at a glance, or Market snapshot. Do not cite the Fact article again as a second summary.
2. One external view — exactly one named house or official already in the tape, format `House (d Month):`, inside the logic as evidence. Never a second view. Never a second summary of that article.
3. Asset effect — how this theme affects this card's `assets`. If it moves no book, say so in one clause. Do not invent a spillover.

```yaml
- id: german-cpi-energy
  title: German inflation is re-accelerating on energy   # the force, not the tape
  grade: STRONG            # STRONG: primary print moved a named book, dated settle in the calendar window
                           # MODERATE: desk view, tick, or no dated settle yet
                           # WEAK: headline the books did not trade
  assets: [Bunds, EUR]     # 1–3 books this force actually moved
  fact: >-                 # 1–3 lines, `Cite: statement`. Only prints this So what uses.
    Destatis: August flash CPI is +2.9% y/y after +2.8% in July, with energy +10.5%; finals are due 10 September.
    财经早茶 欧洲股债: Bunds fell for a sixth session as Middle East risk fed inflation worry.
  factSources:             # exactly those cites, ≤ 4 chips
    - { label: Destatis, href: ... }
    - { label: 彭博财经早茶 Sep 3, href: ... }
  mechanism: >-
    Energy is leading the CPI basket, so Bunds are paying an energy-led restriction premium.
    CICC (1 September): euro-area export orders are rising, which is evidence the ECB can stay restrictive.
    Bunds and the euro are paying that premium.
  status: new              # vs previous briefing: continuing / escalated / retired / new
```

**Desk view.** Exactly one per card, from the tape — never pad a second, never invent a house. Named house or official with a date (GS, MS, JPM, BofA, Nomura, CICC, IEA, OPEC, Glassnode, IMF, BIS, a central banker, 财经早茶). Format `House (d Month):` inside the judgment as evidence, never as a second summary of the article. Search CICC per force; 财经早茶 GS/MS/JPM lines; 见闻 sell-side; Glassnode inbox. Source in `keySources`.

Stay on this card’s books. Do not write “keep X on the other card”, “this is not the Y book”, or “rather than the ⟨other⟩ spillover”. Only numbers already in this card’s `fact` or `factSources`. Paragraph must add logic `fact` does not contain — do not restate Fact, Summary, Markets at a glance, or Market snapshot. **Plain language:** short sentences; state the pivotal point and the cause-effect chain from the cited article. No hedge-fund jargon (e.g. "narrative multiple", "discount-rate relief", "flow-built profit cushion", "meeting premium", "term premium") — if the logic is simple, write it simply. Banned phrases: "sets the next tape", "is the next print", "is the settle", "keeps the case alive", "takes … off the tape", "treating … as", "pricing some of the … back out", "room for", "still leaves … on the table", "worth watching", "this card". Banned opener: "A ⟨number⟩ ⟨thing⟩ next to a ⟨number⟩ ⟨thing⟩ is…". Banned opener: "⟨asset⟩ is now pricing ⟨N⟩ against ⟨prior⟩". Banned tail: "Horizon is …, ending at …", or any calendar event whose predicate is the next print/settle/tape — that date lives in `eventCalendar` / `watch`. Do not write `horizon`, `trigger`, or `invalidator` on a theme. No mechanical gold invalidation line.

`verify-briefing` fails dumps (fact not 1–3, so-what not 2–4, chips not 1–4, Yahoo quote chips, all same grade, so-what number missing from fact, missing `status`, no `House (d Month):` on any card). Unused prints → What changed. Do not write `singleSource`. No CLAIM. Mail 市场一览 is `marketOverview`, never Yahoo. Merge cards that share a mechanism; keep oil separate when the desk names geopolitics. Chip `themeId` on calendar rows.

**Bitcoin:** `gn metric` if keyed; else inbox Week on Chain as desk view. Do not invent on-chain sizes.

Self-check before PR: every **rendered** table row above is non-empty **except** omit `bloomberg-chart-of-day` when `$TODAY` PNG is missing; CICC attempted; China three desks or caveat; BlockBeats four books on matching Themes when the tape has them; if a chart is present its PNG date is `$TODAY`; Themes titles/facts match that chart and today’s desk (no Theme citing yesterday’s PNG as 今日图表); every Theme fits the **Theme card** block above; `marketOverview` is today’s mail 市场一览 (Chinese, mail order — not 见闻 市场收报), and the English section title is **Markets at a glance**; prose is complete sentences (not keyword stitches) and every rendered sentence is `{ en, zh }`; the word CLAIM does not appear in the briefing YAML; no invented tape; no duplicate `keySources` href; every key source has `books` + `influence`; every untimed calendar row has the right `timing`; IPO lines split deal size from net proceeds; rows the text quotes differently carry a `printNote`; header, snapshot map, greeting, and same-fact rules above still hold.

Do not record a walkthrough video.
---
