# Design: Daily Financial Insights Website

**Date:** 2026-07-14  
**Branch:** `Shanova/daily-insights-website-9ba4`

## Goal

Turn the existing Cursor Agent skill pipeline (`daily-financial-briefing` and stages) into a public website that publishes the daily briefing as a readable product — same structure, higher presentation quality.

## Assumptions (locked for v1)

1. **Publication site, not agent runner.** The site displays finished briefings. It does not invoke Cursor agents or scrape live markets in the browser.
2. **Content source of truth:** Markdown files under `content/briefings/YYYY-MM-DD.md` with YAML frontmatter matching the report template sections.
3. **Seed content:** One briefing for 2026-07-13 from the pipeline output already produced.
4. **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, static-export friendly.
5. **Language:** English for v1 (matches latest user request language).
6. **Disclaimer required** on every briefing page (research synthesis, not investment advice).

## Out of scope (v1)

- Live agent pipeline execution / Cursor SDK integration
- User accounts, comments, email subscriptions
- Real-time market tickers or charts APIs
- CMS / admin UI
- Chinese locale

## Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **A. Next.js + Markdown briefings (chosen)** | Matches skill output format; fast; easy to extend with new days | Manual content add for now |
| B. Pure static HTML hand-built | Minimal deps | Harder to maintain archive + template |
| C. Full agent-triggered web app | “Runs the skill” | Needs secrets, long jobs, far beyond ask |

**Recommendation:** A.

## Information architecture

| Route | Purpose |
|-------|---------|
| `/` | Today's (latest) briefing — brand-forward first viewport |
| `/briefings` | Archive list of all published briefings |
| `/briefings/[date]` | Single briefing detail |
| `/pipeline` | Explains the 6-stage skill pipeline (from README/skills) |

## Page composition (home / briefing)

Follow frontend hard rules: one composition in first viewport; brand as hero signal; no card clutter in hero; one job per section.

1. **Hero (first viewport):** Brand name “Daily Financial Insights”, date, one-line market tone, single CTA (“Read briefing” / scroll). Full-bleed atmospheric background (gradient + subtle grain), not inset media cards.
2. **Executive summary** — 3–5 bullets + Signal + Watch
3. **Global situation**
4. **China situation**
5. **Signals** (graded STRONG / MODERATE / WEAK)
6. **What to watch** (prioritized, with trigger / invalidator)
7. **Sources & caveats** + mandatory disclaimer

## Visual direction

- **Brand:** Daily Financial Insights (wordmark as hero typography)
- **Palette:** Cool ink charcoal `#0F1419`, paper `#F7F4EF` is avoided as primary cream trap — use cool mist `#EEF2F4` with deep forest `#0B3D2E` and a single copper accent `#C45C26` used sparingly for signal grades / CTAs. Background atmosphere via layered gradients + faint grid, not flat fill.
- **Type:** `Fraunces` (display/brand) + `Manrope` (UI/body) — expressive, not Inter/Roboto.
- **Motion:** soft hero fade/rise, section reveal on scroll, signal grade pulse once on enter (2–3 intentional motions).
- **Cards:** none in hero; archive list may use light interactive rows (interaction container only).

## Content model

```yaml
# frontmatter
date: 2026-07-13
title: Daily Financial Briefing
coverageWindow: July 10–13, 2026
marketTone: Risk-off — Middle East escalation...
```

Body uses structured markdown headings matching the report template (`## Executive Summary`, etc.). A small parser maps headings into typed sections for layout.

## Components (focused units)

- `BriefingHero` — brand + date + tone
- `ExecutiveSummary`
- `SituationBlock` — global / China
- `SignalList` / `SignalItem`
- `WatchList` / `WatchItem`
- `SourcesCaveats`
- `PipelineSteps` — for `/pipeline`
- `BriefingArchive`

## Data flow

1. Author (or agent) writes `content/briefings/YYYY-MM-DD.md`
2. Build-time loader reads all files, sorts by date desc
3. `/` resolves to latest; `[date]` renders one; `/briefings` lists all

## Error handling

- Missing content dir → empty archive with explanatory empty state
- Invalid date param → 404
- Malformed frontmatter → skip file at build with console warning

## Testing / verification

- `npm run build` succeeds
- Latest briefing renders on `/`
- Archive and pipeline pages load
- Mobile layout: hero stacks, sections remain single-column readable

## Success criteria

- Visitor understands the product brand in the first viewport without nav context
- A reader can finish the briefing in ~5 minutes
- Adding a new markdown file publishes a new day after rebuild
- Skills remain the research pipeline; the site is the presentation layer
