# Theme cards P0–P1 Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship the approved design’s first slice: fix Detail hash scrolling, add theme cards as the only full narrative unit, tighten freshness copy, and wire generate-prompt rules — without yet adding new RSS sources.

**Architecture:** Optional `themeCards[]` on briefing frontmatter/JSON. New `ThemeCards` section sits after Skim and before Tape/Closes. Existing Signals/Watch remain in Detail for backward compatibility; skim becomes title+anchor when theme cards exist. Hash scroll waits until Detail is open before `scrollIntoView`.

**Tech Stack:** Next.js / React, gray-matter briefing YAML → `sync-briefing-data`, TypeScript types in `web/src/lib/types.ts`.

**Spec:** `docs/superpowers/specs/2026-08-06-module-source-depth-design.md`

---

## File map

| File | Role |
|------|------|
| `web/src/lib/types.ts` | Add `ThemeCard`, `themeCards?` |
| `web/src/components/ThemeCards.tsx` | New primary section UI |
| `web/src/components/BriefingView.tsx` | Mount ThemeCards |
| `web/src/components/SectionNav.tsx` | Themes nav + 速览/深读 grouping |
| `web/src/components/DetailTabs.tsx` | Reliable hash scroll after open |
| `web/src/components/ExecutiveSummary.tsx` | Theme title anchors when present |
| `web/src/components/LiveHome.tsx` / hero | Freshness / “最近一期” + stale days |
| `web/src/lib/detail-tabs.test.mjs` or new test | Scroll/hash helpers if extracted |
| `web/content/briefings/2026-08-03.md` + public JSON | Sample `themeCards` |
| `scripts/generate-daily-briefing.mjs` | Prompt: one event → one theme card |
| `docs/superpowers/plans/2026-08-06-theme-cards-p0-p1.md` | This plan |

---

### Task 1: P0 — Detail hash scroll

**Files:** Modify `web/src/components/DetailTabs.tsx`

- [x] Scroll only after `open === true` (useEffect on `[open, active]` when hash is a detail hash)
- [x] On tab click `selectTab`, also scroll `#detail` into view
- [x] Avoid double-scroll races with closed panel mount

### Task 2: P0 — Freshness copy

**Files:** `LiveHome.tsx`, optionally `BriefingHero.tsx`

- [x] Soften “publishes twice daily” to “最近一期 / latest published” when stale
- [x] If `publishedAt` older than 36h, show explicit “Published N days ago”

### Task 3: ThemeCard types

**Files:** `web/src/lib/types.ts`

- [x] Add:

```ts
export interface ThemeCard {
  id: string;
  title: string;
  grade: SignalGrade;
  assets?: string[];
  fact: string;
  factSources?: FactSource[];
  mechanism: string;
  trigger: string;
  invalidator: string;
  horizon: string;
  status: "new" | "continuing" | "escalated" | "retired";
}
```

- [x] `themeCards?: ThemeCard[]` on `BriefingFrontmatter`

### Task 4: ThemeCards UI + nav

**Files:** Create `ThemeCards.tsx`; modify `BriefingView`, `SectionNav`, `ExecutiveSummary`

- [x] List/section layout (no cards-in-hero chrome; section list is fine per design — avoid heavy card chrome)
- [x] Each theme: grade, title, fact (+ compact source chips), mechanism, trigger, invalidator, horizon, status
- [x] `id={`theme-${id}`}` for anchors
- [x] SectionNav: add `#themes` under 速览 when `hasThemes`
- [x] ExecutiveSummary: if themes present, render title links to `#theme-…` instead of duplicating long bullets when possible

### Task 5: Sample content on latest briefing

**Files:** `web/content/briefings/2026-08-03.md` + sync JSON

- [x] Derive 3–5 `themeCards` from existing strong signals / watch (oil, yen, China, BTC/Glassnode as fits)
- [x] Slim skim bullets to point at themes where they currently restate the same story
- [x] Keep Global/China/signals/watch data for now (compat); themes are the narrative home

### Task 6: Generate prompt

**Files:** `scripts/generate-daily-briefing.mjs`

- [x] Require `themeCards` (3–5) as the only full narrative
- [x] Skim = titles/anchors; Watch = forward calendar/triggers; Assets cite themes; no verbatim doubles

### Task 7: Verify + PR

- [ ] `npm test` / detail-tabs tests; `npm run sync-data`; lint touched files
- [ ] Commit, push, open/update PR, merge when green, deploy-pages
