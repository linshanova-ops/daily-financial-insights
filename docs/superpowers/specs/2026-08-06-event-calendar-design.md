# Event Calendar (replace Watch) — Design

> Status: **approved frame** (2026-08-06) — ready for implementation plan after spec review.  
> Related: `docs/superpowers/specs/2026-08-06-module-source-depth-design.md` (Watch = forward calendar + risks).  
> This spec **narrows Watch to Event Calendar only** and drops narrative trigger/invalidator duplication with Themes.

## Problem

After theme cards shipped, the Detail **Watch** section still reads like a second Themes list: same stories, trigger/invalidator prose, few true dated prints. Readers who want “what prints next” leave empty-handed.

## Goal

Replace Watch with an **Event Calendar**: vital dated releases and speeches from **briefing publish day through next Friday** (Beijing trading-week window), with an optional chip linking to an open theme — **no** trigger/invalidator/why narrative.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Content model | **B** — dated rows + optional theme chip; no trigger/invalidator prose |
| Window | **C** — from briefing `date` through **next Friday** (Beijing) |
| Density | **C** — vital + standing fixtures even if inbox omitted them |
| Schema | Replace narrative `watchItems` usage with `eventCalendar[]` (Approach 1) |
| Tab label | **Calendar** (keep `#watch` as alias redirect to `#calendar` for old links) |

## Coverage spine (must fetch / include when in-window)

**US / China / Japan**
- Economic data releases
- Central bank meetings, actions, speeches
- Key tech / AI company earnings
- Key IPOs

**US extras**
- Monthly **TIC**
- Quarterly **refunding** announcement

**UK / EU**
- Economic data releases
- Central bank meetings, actions, speeches

Skip routine second-tier color that is not dated. Prefer Bloomberg IMAP **日程** + **央行和政府动态**; fill gaps with dated, verifiable calendars (Fed, BLS, ECB, BOE, BOJ, NBS/PBOC schedules, IR calendars for named mega-cap AI/tech). **Never invent a print date or consensus.**

## Schema

```ts
export type EventRegion = "US" | "China" | "Japan" | "UK" | "EU" | "Other";
export type EventCategory =
  | "data"
  | "central-bank"
  | "earnings"
  | "ipo"
  | "fiscal-flow"; // TIC, refunding, similar

export interface CalendarEvent {
  id: string; // stable slug, e.g. "us-initial-claims-2026-08-06"
  date: string; // YYYY-MM-DD (Beijing calendar day of release/speech)
  timeBeijing?: string; // "HH:mm" when known; omit if TBD
  region: EventRegion;
  category: EventCategory;
  event: string; // short title, e.g. "US initial jobless claims"
  consensus?: string; // e.g. "205k" — only if sourced
  prior?: string; // e.g. "197k" — only if sourced
  /** Optional link to an open theme card (chip only — no narrative restatement). */
  themeId?: string;
  source: FactSource;
  sources?: FactSource[];
}

export interface EventCalendar {
  /** Inclusive window in Beijing dates. */
  windowStart: string; // YYYY-MM-DD (= briefing date)
  windowEnd: string; // YYYY-MM-DD (= next Friday on/after start)
  note?: string;
  events: CalendarEvent[];
}
```

On `BriefingFrontmatter`:
- Add required-for-new-briefings `eventCalendar?: EventCalendar` (optional for older archives).
- **Deprecate narrative `watchItems` for new editions.** Keep type for back-compat rendering: if `eventCalendar` present, Calendar UI uses it; else fall back to legacy WatchList.
- Skim `watch` one-liner: point at the calendar window (e.g. “Aug 6–Aug 14: claims, …”) — not a theme rewrite.

### Window computation

Given briefing `date` `D` (Beijing calendar day):
1. `windowStart = D`
2. `windowEnd =` the Friday on or after `D`; if `D` is Friday, `windowEnd = D`; if `D` is Saturday/Sunday, use the **next** Friday (post-weekend open through that Friday).

Header copy: `Event window: {windowStart} → {windowEnd} (Beijing)`.

## UI

- Detail tab: label **Calendar**, hashes `["calendar", "watch"]` (watch alias).
- Section id: `#calendar`.
- Layout: **day-grouped list** (not cards). Each day: date heading; rows with time (if any), region, category, event, optional consensus/prior, optional theme chip → `#theme-{id}`.
- Kind label: Fact (dated schedule), not Judgment.
- Empty day: omit (don’t render empty shells).
- If zero events: one honest line — “No dated fixtures verified in window” — prefer filling fixtures over empty.

## Generate / accuracy rules

1. Build `eventCalendar` every new briefing; target **~8–20** rows for a normal week (more only if densely scheduled).
2. Inbox 日程/央行动态 → first pass; then standing fixtures from coverage spine if dated and in-window.
3. Theme chips: only when the print clearly maps to an existing `themeCards[].id`; chip shows theme **title** only.
4. Ban: `why` / `trigger` / `invalidator` / desk-risk essays in this section.
5. Consensus/prior require a source href that supports the number (same accuracy gate as elsewhere).
6. Prompt update in `scripts/generate-daily-briefing.mjs`: require `eventCalendar`; stop requiring narrative `watchItems` for new files.
7. Commit markdown + JSON together; `verify-briefing` / scan-links apply to calendar sources.

## Migration

- Latest briefing (and next publishes): populate `eventCalendar` from inbox + fixtures; drop narrative watch rows from UI path.
- Older briefings: unchanged legacy WatchList until optionally backfilled (non-goal for P0 of this change).

## Non-goals

- Asset Framework merge / redesign (separate request — prior message truncated).
- Live ticking calendar widget or exchange holiday engine v1.
- Replacing Themes’ trigger/invalidator (those stay on theme cards).
- Showing every second-tier regional speech worldwide.

## Success criteria

- Calendar and Themes do not read as the same section.
- A reader can answer “what vital prints hit before next Friday?” from Calendar alone.
- Coverage spine regions/topics appear when scheduled in-window.
- Theme chips are optional pointers, not story rewrites.
- CI accuracy gate stays fail-closed on sourced consensus/prior.

## Implementation sketch (for plan)

1. Types + `detail-tabs` Calendar label/hashes  
2. `EventCalendar` component; `BriefingView` / DetailTabs wiring; legacy fallback  
3. Generate-prompt rules + sample migrate latest briefing  
4. Verify, PR, deploy  

---

## Approval

Frame approved in conversation 2026-08-06 (choices B / trading-week-to-Friday / vital+fixtures / coverage spine). Spec file awaiting user review before implementation plan.
