# Event Calendar + Asset Classes Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Replace Detail Watch with Event Calendar (publish→next Friday) and regroup Assets by class (US equities · China/HK equities · Rates · FX · Commodities · Crypto).

**Architecture:** Optional `eventCalendar` + `assetClasses` on briefing frontmatter. UI prefers new shapes; falls back to legacy `watchItems` / `assetFramework`. Generate prompt requires both for new briefings. Migrate `2026-08-06.md` as sample.

**Tech Stack:** Next.js / React, gray-matter YAML, TypeScript types in `web/src/lib/types.ts`.

**Spec:** `docs/superpowers/specs/2026-08-06-event-calendar-design.md`

---

## File map

| File | Role |
|------|------|
| `web/src/lib/types.ts` | `CalendarEvent`, `EventCalendar`, `AssetClassBlock`, frontmatter fields |
| `web/src/lib/event-calendar-window.ts` | `windowEndForBriefingDate(date)` |
| `web/src/lib/event-calendar-window.test.mjs` | Window unit tests |
| `web/src/lib/detail-tabs.ts` | Calendar label; hashes `calendar` + `watch` |
| `web/src/lib/detail-tabs.test.mjs` | Hash mapping tests |
| `web/src/components/EventCalendarView.tsx` | Day-grouped calendar UI |
| `web/src/components/AssetClasses.tsx` | Class-grouped assets UI |
| `web/src/components/BriefingView.tsx` | Wire calendar + assetClasses with fallbacks |
| `web/src/components/AssetFramework.tsx` | Keep for legacy only |
| `web/src/components/WatchList.tsx` | Keep for legacy only |
| `scripts/generate-daily-briefing.mjs` | Prompt rules |
| `.cursor/skills/.../asset-framework.md` | Canonical class taxonomy |
| `web/content/briefings/2026-08-06.md` + public JSON | Sample migration |

---

### Task 1: Types + window helper

**Files:** Modify `web/src/lib/types.ts`; Create `web/src/lib/event-calendar-window.ts`; Create `web/src/lib/event-calendar-window.test.mjs`

- [ ] Add types from spec (`EventCalendar`, `CalendarEvent`, `AssetClassBlock`, …)
- [ ] Add `eventCalendar?` and `assetClasses?` on `BriefingFrontmatter`
- [ ] Implement `nextFridayOnOrAfter(isoDate: string): string` and `eventWindowForBriefingDate(d)`
- [ ] Tests: Thu→Fri same week; Fri→Fri; Sat→next Fri; Sun→next Fri
- [ ] Commit

### Task 2: Detail tabs + Calendar UI

**Files:** Modify `detail-tabs.ts` + test; Create `EventCalendarView.tsx`; Modify `BriefingView.tsx`

- [ ] Tab label `Calendar`, hashes `["calendar", "watch"]`, keep id `"watch"` for minimal churn **or** rename id to `"calendar"` and map both hashes (prefer rename id to `calendar` with watch alias in hashes)
- [ ] `EventCalendarView`: day groups, theme chips, Fact kind label
- [ ] BriefingView: if `eventCalendar?.events?.length` render EventCalendarView else WatchList
- [ ] Commit

### Task 3: AssetClasses UI

**Files:** Create `AssetClasses.tsx`; Modify `BriefingView.tsx`

- [ ] Render six class blocks in fixed order
- [ ] Instrument rows + optional theme chip
- [ ] BriefingView: if `assetClasses?.length` use AssetClasses else AssetFramework
- [ ] Commit

### Task 4: Generate prompt + skill reference

**Files:** `scripts/generate-daily-briefing.mjs`; skill `asset-framework.md`

- [ ] Require `eventCalendar` + `assetClasses`; 日程→eventCalendar; ban narrative watchItems for new files
- [ ] Update canonical asset set to class taxonomy
- [ ] Commit

### Task 5: Migrate 2026-08-06 + verify + ship

**Files:** `web/content/briefings/2026-08-06.md` + synced JSON

- [ ] Build `eventCalendar` for Aug 6→Aug 7 from inbox 日程/央行 + fixtures
- [ ] Build `assetClasses` from existing assetFramework content
- [ ] Slim skim `watch` one-liner to calendar window
- [ ] `npm run sync-data` + `scan-links`; fix cites
- [ ] Commit, push, PR, merge, deploy-pages

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Event calendar schema + window | 1 |
| Calendar UI + `#watch` alias | 2 |
| Asset class schema + UI | 1, 3 |
| Generate rules | 4 |
| Sample latest briefing | 5 |
| Legacy fallback | 2, 3 |
