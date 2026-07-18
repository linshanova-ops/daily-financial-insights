# Market Dashboard Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Add a Market Dashboard closes table under the hero, populated at twice-daily generate via free market APIs and stored in briefing frontmatter.

**Architecture:** `fetch-market-closes.mjs` builds a `marketDashboard` snapshot (Yahoo / Treasury / CoinGecko / OKX). Inject into briefing YAML → sync JSON feed → `MarketDashboard` React section reads published data.

**Tech Stack:** Node fetch scripts, gray-matter, Next.js / React, existing SourceButton + accent patterns.

---

### Task 1: Types + fetch helpers + tests
- [ ] Add `MarketDashboard*` types to `web/src/lib/types.ts`
- [ ] Add `web/scripts/lib/market-closes-format.mjs` + node:test
- [ ] Add `web/scripts/fetch-market-closes.mjs` (fetch + `--inject`)

### Task 2: UI module
- [ ] `MarketDashboard.tsx`
- [ ] Wire `BriefingView` (after hero, before KeyFigures) + `SectionNav`

### Task 3: Publish wiring + seed
- [ ] Update generate prompt to run inject
- [ ] Inject into latest briefing + sync-data
- [ ] Commit / PR
