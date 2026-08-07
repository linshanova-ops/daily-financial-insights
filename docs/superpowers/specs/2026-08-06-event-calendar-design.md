# Event Calendar + Asset class framework — Design

> Status: **approved frame** (2026-08-06) — ready for implementation plan after spec review.  
> Related: `docs/superpowers/specs/2026-08-06-module-source-depth-design.md`.  
> Part A narrows Watch → **Event Calendar only**.  
> Part B regroups Assets by **asset class** (equities split US vs Asia — Greater China + Japan/Korea; FX as a class, not currency peers).

---

# Part A — Event Calendar (replace Watch)

## Problem

After theme cards shipped, Detail **Watch** still reads like a second Themes list: same stories, trigger/invalidator prose, few true dated prints.

## Goal

**Event Calendar**: vital dated releases/speeches from **briefing publish day through next Friday** (Beijing), optional theme chip — **no** trigger/invalidator/why narrative.

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Content model | **B** — dated rows + optional theme chip; no trigger/invalidator prose |
| Window | **C** — from briefing `date` through **next Friday** (Beijing) |
| Density | **C** — vital + standing fixtures even if inbox omitted them |
| Schema | Replace narrative `watchItems` with `eventCalendar` |
| Tab label | **Calendar** (`#watch` alias → `#calendar`) |

## Coverage spine (when in-window)

**US / China / Japan:** economic data; CB meetings/actions/speeches; key tech/AI earnings; key IPOs  

**US extras:** monthly **TIC**; quarterly **refunding**  

**UK / EU:** **central-bank only** (meetings / actions / speeches) — do **not** list UK/EU economic data.

**Greater China:** Taiwan (and HK SAR) prints sit under region **China**, not Other.

Prefer Bloomberg IMAP **日程** + **央行和政府动态**; fill gaps with dated verifiable calendars. **Never invent a print date or consensus.**

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
  id: string;
  date: string; // YYYY-MM-DD Beijing day of release/speech
  timeBeijing?: string; // "HH:mm" when known; omit if unknown
  region: EventRegion;
  category: EventCategory;
  event: string;
  consensus?: string; // only if sourced
  prior?: string; // only if sourced
  themeId?: string; // chip → #theme-{id}; title only
  source: FactSource;
  sources?: FactSource[];
}

export interface EventCalendar {
  windowStart: string; // = briefing date
  windowEnd: string; // = Friday after Friday-on-or-after start (see below)
  note?: string;
  events: CalendarEvent[];
}
```

On `BriefingFrontmatter`:
- `eventCalendar?` required for new briefings; optional on archives.
- Deprecate narrative `watchItems` for new editions; legacy WatchList if no `eventCalendar`.
- Skim `watch` one-liner points at the calendar window only.

### Window computation

Given briefing date `D` (Beijing):
1. `windowStart = D`
2. Let `thisFriday` = Friday on or after `D` (if `D` is Friday, `thisFriday = D`).
3. `windowEnd` = `thisFriday + 7 days` (**next** Friday — always looks past the coming weekend).

Examples: Thu 2026-08-06 → end 2026-08-14; Fri 2026-08-07 → end 2026-08-14.

Header: `{windowStart} → {windowEnd} (Beijing)`.

## UI

- Tab **Calendar**; hashes `["calendar", "watch"]`; section `#calendar`.
- Compact chronological rows (not cards / not tall day blocks): date · time · region · event · consensus/prior · theme chip.
- Kind: Fact. Prefer filling fixtures over an empty section; keep density tight.

## Generate / accuracy

1. Every new briefing: `eventCalendar` (~8–20 rows typical).
2. Inbox first; then standing fixtures from coverage spine.
3. Theme chips only when mapped to an existing `themeCards[].id`.
4. Ban why/trigger/invalidator/desk-risk essays here.
5. Consensus/prior must pass scan-links evidence.
6. Update `scripts/generate-daily-briefing.mjs` accordingly.

## Migration

Latest + future briefings get `eventCalendar`. Older keep legacy WatchList (backfill non-goal).

---

# Part B — Asset Framework by class

## Problem

Assets is a flat eight-item grid where **USD** and **JPY** sit as peers of Oil/Equities — currency-as-asset, hard to scan by class.

## Goal

Regroup Detail **Assets** by **asset class**, with equities split **US vs Asia** (Greater China + Japan/Korea). Currencies live **under FX**, not as top-level peers.

## Decision (locked)

**B** — class headers; equities regional split; no currency-as-top-level.

## Class order (fixed)

1. **US equities**  
2. **Asia equities** (instruments: Golden Dragon / HK-linked · Japan/Korea in parallel)  
3. **Rates** (UST; China rates only if sourced)  
4. **FX** (USD / JPY / CNY as instrument rows)  
5. **Commodities** (oil, gold, …)  
6. **Crypto**

## Schema

Prefer evolving to class-grouped structure (new briefings); keep flat `AssetView[]` readable as legacy fallback by mapping `asset` strings → class in UI if needed.

```ts
export type AssetClassId =
  | "us-equities"
  | "asia-equities"
  | "rates"
  | "fx"
  | "commodities"
  | "crypto";

export interface AssetInstrument {
  name: string; // e.g. "S&P 500 / Nasdaq", "USD (DXY)", "USD/JPY"
  driver: string;
  driverSources?: FactSource[];
  read: string;
  invalidator?: string;
  themeId?: string; // optional chip; do not paste theme narrative
}

export interface AssetClassBlock {
  id: AssetClassId;
  title: string; // display header
  regime: string; // one class-level regime line
  instruments: AssetInstrument[]; // 1–3 typical
}

// BriefingFrontmatter:
// assetClasses?: AssetClassBlock[];  // preferred for new editions
// assetFramework?: AssetView[];      // legacy flat eight
```

**UI rule:** if `assetClasses` present, render grouped sections; else legacy flat `AssetFramework`.

## Content rules

- Class gets **one** regime line; instruments carry today’s driver/read.
- Prefer `themeId` chips over rewriting Themes.
- FX: always class **FX** with named crosses/indices as rows — never top-level “USD” / “JPY” cards.
- Quiet class: one line “regime unchanged” + latest sourced level — don’t pad.
- Drivers still need numbers + sources (accuracy gate).

## Generate

Prompt: emit `assetClasses` ×6 in fixed order; stop treating currencies as peer assets of commodities. Update skill note in `interpreting-market-signals/references/asset-framework.md` to match (implementation task).

## Migration

- Sample latest briefing on implement.
- Archives keep flat `assetFramework` until touched.

---

# Shared non-goals

- Live ticking calendar / full holiday engine v1.
- Replacing Themes’ trigger/invalidator.
- Exhaustive global second-tier speeches.
- Cards-in-hero chrome for Calendar or Assets.

# Shared success criteria

- Calendar ≠ Themes; answers “what prints before next Friday?”
- Assets scannable by class; FX nested; US vs Asia equities separated (Greater China + Japan/Korea).
- Theme chips are pointers only.
- CI accuracy gate remains fail-closed.

# Implementation sketch (for plan)

1. Types: `EventCalendar`, `AssetClassBlock`; detail-tabs Calendar label  
2. `EventCalendarView` + legacy Watch fallback  
3. `AssetClasses` UI + legacy AssetFramework fallback  
4. Generate prompt + skill reference update  
5. Migrate latest briefing sample; verify; PR; deploy  

---

## Approval

- Part A approved 2026-08-06 (B / to-Friday / vital+fixtures / coverage spine).  
- Part B approved 2026-08-06 (class taxonomy B).  
- Spec awaiting final user review before implementation plan.
