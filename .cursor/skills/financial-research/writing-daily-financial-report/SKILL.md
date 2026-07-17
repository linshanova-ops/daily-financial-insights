---
name: writing-daily-financial-report
description: Use when assembling gathered news, macro analysis, signals, and suggestions into a final daily financial report or briefing document for a reader.
---

# Writing the Daily Financial Report

## Overview

Assemble the pipeline's outputs into one readable document. This stage is about editing and packaging — no new analysis. If writing reveals a gap, go back to the earlier stage, fix it there, then return.

**Core principle: write for a busy reader who may only read the first ten lines.** The executive summary must stand alone; everything after it is progressively deeper detail.

## When to Use

- Stage 6 (final) of the daily briefing pipeline
- Inputs required: news log, global assessment, China assessment, graded signals, prioritized suggestions

## Report Structure

Use [assets/report-template.md](assets/report-template.md) as the skeleton. Sections in order:

1. **Header** — date, coverage window, one-line market tone
2. **Executive summary** — 3–5 bullets: the day's most important facts + the single most important signal + the top suggestion. A reader who stops here should still be correctly oriented.
3. **Global situation** — from `analyzing-global-macro` output, tightened
4. **China situation** — from `analyzing-china-macro` output, tightened
5. **Asset framework** — stable per-asset regime lens (see `interpreting-market-signals/references/asset-framework.md`): for each of the eight canonical assets, name the dominant regime (beta), today's driver reading with a number, how the asset traded vs the regime, and the regime invalidator. Website key: `assetFramework`.
6. **Signals** — the graded list, strongest first
7. **What to watch (suggestions)** — the prioritized watch-list with triggers/invalidators
8. **Sources & caveats** — key sources consulted; flag any single-source items relied on; standing disclaimer

## Style Rules

- **Numbers, dates, names** — "PBOC cut the 7-day reverse repo rate 10bp to 1.4% on Tuesday", not "China eased policy recently"
- **Source every hard number** — attach outlet/agency on first use of a figure (e.g. BLS, Yicai, Fed). If you cannot name a source, do not publish the figure.
- **Beat/miss is vs consensus, not vs prior** — for inflation, cooler-than-expected = miss; hotter = beat. For growth/jobs (GDP, payrolls, retail sales), above-consensus = beat; below = miss. **Never swap “good news” for beat/miss:** jobless claims or unemployment below consensus is still a **below-consensus / downside print** on that series — say “below consensus,” not “beat,” just because markets read it as strong labor.
- **Confidence language is calibrated:** *is/did* for confirmed facts; *appears/suggests* for graded inference; *possible/worth watching* for weak signals. Never present a WEAK signal in *is* language.
- **Facts before interpretation** within each section — reader should be able to see where reporting ends and judgment begins
- **Length:** ~1,000–1,500 words total. Executive summary ≤ 120 words.
- **Quiet days:** say "little regime-relevant news today" in one line rather than inflating minor items. A short honest report beats a padded one.
- **Language:** match the user's request language (Chinese request → Chinese report, keeping key terms/tickers in original form)

## Pre-publish accuracy gate

Before finalizing website YAML, re-check:

1. Every index % change matches the named index's **close** (not another Asia index).
2. Every official print matches the primary release (BLS/NBS/PBOC/Fed).
3. Consensus labels (beat/miss) match actual vs survey.
4. PBOC OMO: ops size, maturity, **net** = ops − maturity, with correct 亿元→CNY bn conversion.
5. No conflicting levels for the same asset in one briefing (e.g. two different gold prices without labels).
6. **Calendar-year / coverage-window check on every hard quote.** Open the cited URL and confirm the article's publication year matches the briefing coverage window. Reject undated aggregator flashes that only say "7月15日" without year if the level conflicts with same-day tier-1/2 tape (example: BTC $116k flash vs Jul 2026 mid-$60k Cointelegraph/Fortune — treat as stale and discard).
7. **华尔街见闻 cites:** for Shanghai / Hang Seng / Fed speech numbers, prefer primary URLs. If citing wallstreetcn.com, the page must show the coverage year (or a same-day primary confirms the level). Reject month-day-only wraps and IDs near known-bad 2025 clusters (3751205 A/H wrap; 3751275 Williams) — note rejections in `singleSource`.
8. **Crypto prints:** prefer dated Cointelegraph / CoinDesk / Yahoo Finance BTC-USD (or similar) over a single BlockBeats HTX flash. If BlockBeats is used for crypto color, triangulate the level against an independent dated source before publishing.
9. Every `href` on a sourced fact must support the number claimed; if the page is wrong-year or off-level, replace the source — do not keep a convenient link.
10. **Site-wide machine scan:** after writing YAML, from `web/` run `npm run scan-links`. It fetches **all** cited hrefs (every briefing field + `web/src`), checks publication year, and verifies claim numbers appear on the cited page(s). Failures block publish; fix the cite/claim or add bad IDs to `web/scripts/rejected-source-ids.json`.

## Mandatory Disclaimer

End every report with:

> This report is research and information synthesis, not investment advice. Verify figures against primary sources before acting on them.

## Common Mistakes

- **Calling cooler inflation a "beat"** — below-consensus CPI/PCE is a **miss** / downside surprise, not a beat. Keep consensus vs actual side-by-side so the label is checkable.
- **Calling below-consensus jobless claims a "beat"** — 208k vs 218k expected is below consensus; “beat” confuses market tone with the print-vs-survey label. Prefer “below consensus.”
- **Executive summary written first and never updated** — write it last, after the body is final.
- **Copy-pasting stage outputs verbatim** — the analysis stages produce working notes; the report needs them edited for a reader (dedupe items that appear in both global and China sections, cut internal jargon like "news-log item #4").
- **Losing traceability while editing** — tightening prose must not detach claims from their sources; keep at least outlet names on key facts.
- **Burying the lede** — if one story dominates the day, it opens the executive summary, even if the template section order puts its detail later.
