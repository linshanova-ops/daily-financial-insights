# Event Calendar — official gov fill + editable earnings watchlist

> Status: **draft for review** (2026-08-07)  
> Extends: `docs/superpowers/specs/2026-08-06-event-calendar-design.md`  
> Problem: Bloomberg IMAP 日程 usually covers only the **current** week, so a
> “through next Friday” window looks empty for the outer days. Earnings for a
> curated company list are also missing unless the inbox happens to mention them.

---

## Goal

Fill Event Calendar from **briefing day through next Friday** with:

1. Bloomberg IMAP 日程 / 央行 (unchanged, still preferred when present)
2. **Official government / CB calendars** for US, China, Japan (+ UK/EU CB-only)
3. **Company financial-report days** from an **editable JSON watchlist**, sourced from IR / official pages

Never invent a print date or consensus. Omit silently when no dated official source exists in-window.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Watchlist editing | **A** — repo JSON like Fund `monitored.json` (PR/commit); no public edit UI |
| Missing earnings date | **A** — keep company on watchlist; emit calendar row only when a dated official print exists |
| Gov calendar geography | **A** — US + China + Japan data/CB; UK/EU **CB-only**; **no** dedicated Taiwan/HK scrapers |
| Pipeline shape | **1** — one fetch script → fixture JSON → merge into `eventCalendar` |
| TW/HK rows | **Out of Event Calendar** — mainland China only; TW/HK may still appear in chinaChanged prose |

### Listing check (2026-08-07) — why omit ≠ drop from watchlist

Not every watchlist name has a regular public earnings calendar today:

| Bucket | Names (approx.) |
|--------|-----------------|
| Long-public | MSFT, GOOGL, AMZN, META, AAPL, ORCL, NVDA, AVGO, AMD, Samsung, SK Hynix, Micron, Tencent, Alibaba, Coinbase, Strategy (MicroStrategy); Circle (IPO Jun 2025) |
| Listed 2026 | SpaceX (SPCX Jun), Zhipu/Z.ai (HK Jan), MiniMax (HK Jan), Changxin/CXMT (STAR Jul); Zhongji HK dual-list Jul 2026 (already on SZSE) |
| Not listed yet | OpenAI, Anthropic (confidential S-1), Moonshot (HK prep), DeepSeek (A-share prep) |

Pre-IPO / no IR date → stay in JSON with `"status": "pre-ipo"` (or equivalent); **no** fake “date TBD” calendar row. Confirmed IPO/listing **day** may appear as `category: "ipo"` when dated and sourced.

### Why not dedicated TW/HK scrapers

Taiwan DGBAS/CBC and HK C&SD publish real calendars (CPI, GDP, etc.), but for this site’s China aspect, **NBS + PBOC** already carry the spine. TW/HK prints are intermittent; when vital they usually already appear in Bloomberg 日程. Dedicated scrapers are low leverage → **out of scope**.

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│ earnings-watchlist  │     │ Official gov / CB sites  │
│ .json  (admin edit) │     │ US / CN / JP / UK·EU CB  │
└─────────┬───────────┘     └────────────┬─────────────┘
          │                              │
          ▼                              ▼
        scripts/fetch-event-calendar.mjs
          │
          ├─► web/content/calendar/gov-fixtures.json
          └─► web/content/calendar/earnings-fixtures.json
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     IMAP 日程/央行   fixtures JSON   standing rules
          └───────────────┬───────────────┘
                          ▼
              eventCalendar.events (briefing)
```

Wire `fetch-event-calendar.mjs` into the daily briefing workflow **before** Cursor generate (same pattern as inbox fetch / fund scan): commit fixtures when changed so generate always sees fresh dates.

---

## Content files

### `web/content/calendar/earnings-watchlist.json` (admin-edited)

```json
{
  "note": "Admin: add/remove companies here. Deploy via PR. Visitors cannot edit.",
  "companies": [
    {
      "id": "msft",
      "name": "Microsoft",
      "ticker": "MSFT",
      "region": "US",
      "irUrl": "https://www.microsoft.com/en-us/investor/earnings/",
      "status": "public"
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "region": "US",
      "irUrl": null,
      "status": "pre-ipo"
    }
  ]
}
```

**Initial seed (user list):** Microsoft, Google, Amazon, Meta, Apple, Oracle, SpaceX, OpenAI, Anthropic, Nvidia, Broadcom, AMD, Samsung, SK Hynix, Micron, Tencent, Alibaba, Moonshot, Zhipu, MiniMax, Deepseek, Changxin, Zhongji, Strategy, Circle, Coinbase.

Document edit path in `web/content/calendar/README.md` (mirror Fund README tone).

### Generated fixtures (script output; commit OK)

**`gov-fixtures.json`**

```json
{
  "fetchedAt": "2026-08-07T12:00:00.000Z",
  "windowStart": "2026-08-07",
  "windowEnd": "2026-08-14",
  "events": [
    {
      "id": "us-cpi-2026-08-12",
      "date": "2026-08-12",
      "timeBeijing": "20:30",
      "region": "US",
      "category": "data",
      "event": "US CPI (July)",
      "source": { "label": "BLS release calendar", "href": "https://www.bls.gov/..." }
    }
  ]
}
```

**`earnings-fixtures.json`** — same event shape; `category: "earnings"` (or `"ipo"`); only rows with `date` ∈ window.

Fixture events must be compatible with existing `CalendarEvent` (`web/src/lib/types.ts`).

---

## Official sources (fetch targets)

Prefer machine-readable or stable HTML calendars. Soft-fail per host (continue others); never invent.

| Region | Sources (minimum) | Categories |
|--------|-------------------|------------|
| US | BLS release calendar; BEA release schedule; Fed calendar (FOMC / dated speeches); Treasury TIC + quarterly refunding | `data`, `central-bank`, `fiscal-flow` |
| China | NBS release schedule; PBOC when dated meetings/ops announced | `data`, `central-bank` |
| Japan | Cabinet Office / Statistics Bureau calendar; BoJ meetings | `data`, `central-bank` |
| UK | Bank of England MPC / dated decisions | `central-bank` only |
| EU | ECB Governing Council / dated decisions | `central-bank` only |

Earnings: company `irUrl` (or well-known IR earnings calendar URL stored on the watchlist row). Parse announced report date + optional time; convert to Beijing date/time when timezone known; omit time if unknown.

---

## Merge rules (into briefing `eventCalendar`)

1. `windowStart` / `windowEnd` from existing `eventWindowForBriefingDate`.
2. Union: IMAP dated rows ∪ `gov-fixtures.json` ∪ `earnings-fixtures.json`.
3. **Dedupe** key: normalized `(date, region, category, event-title slug)` — prefer IMAP row if both exist (keeps inbox consensus/prior when present).
4. Density: aim **~8–20** vital rows once fixtures exist (update generate prompt; prior “4–12” was inbox-starved).
5. UK/EU economic data still **banned**; drop if a scraper accidentally emits them.
6. Taiwan/HK: **omit from eventCalendar** (mainland China only).
7. `scan-links` must accept new official host hrefs (add flaky-host soft-trust only if CI fetch is chronically blocked, same pattern as `ismworld.org`).

---

## Generate prompt updates

Update `scripts/generate-daily-briefing.mjs` Event Calendar bullet:

- Require reading committed `web/content/calendar/*-fixtures.json` for the briefing window.
- Prefer IMAP, then fixtures for gaps through `windowEnd`.
- Earnings rows only for watchlist companies with fixture dates (do not invent from memory).
- Keep theme chip optional; no why/trigger/invalidator.

---

## Workflow

In `.github/workflows/daily-briefing.yml` (primary Beijing window, non-catchup — same gate spirit as Fund scan):

1. Fetch inbox (existing)
2. **`node scripts/fetch-event-calendar.mjs`** → write fixtures; commit if changed
3. Cursor generate (existing) merges into briefing

Manual: `node scripts/fetch-event-calendar.mjs --date YYYY-MM-DD` for local/ops.

---

## UI

- Keep compact chronological `EventCalendarView` (no tall day blocks).
- No visitor-facing watchlist editor.
- Optional one-line calendar `note` when fixtures used, e.g. “Gov + IR fixtures through {windowEnd}; watchlist: `web/content/calendar/earnings-watchlist.json`.” (Editors only need README; note can stay user-facing short.)

---

## Testing

- Unit: window helper unchanged; fixture merge/dedupe pure functions + tests.
- Integration smoke: fetch script with recorded HTML fixtures (or skip-network mode) produces stable JSON.
- `scan-links` green on a sample briefing that cites BLS/NBS/IR URLs.
- Manual: edit watchlist → re-fetch → company appears/disappears correctly.

---

## Out of scope

- Public website admin UI for the company list
- Dedicated Taiwan DGBAS / HK C&SD scrapers
- “Date TBD” placeholder rows
- Expanding UK/EU to economic data
- Backfilling all historical briefings

---

## Migration

1. Add watchlist + empty/seed fixtures + README  
2. Ship fetch script + workflow wire + prompt update  
3. Next briefing (or manual regenerate of latest) gets filled calendar through next Friday  

Latest briefing may be refreshed once after fixtures exist; archives unchanged.
