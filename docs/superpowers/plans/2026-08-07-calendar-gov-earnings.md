# Calendar gov fill + earnings watchlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill Event Calendar through next Friday using official US/China/Japan (+ UK/EU CB) calendars and an editable company earnings watchlist, merged with Bloomberg IMAP.

**Architecture:** Admin-edited `earnings-watchlist.json` plus `scripts/fetch-event-calendar.mjs` write `gov-fixtures.json` and `earnings-fixtures.json`. Pure merge/dedupe helpers union IMAP + fixtures into `eventCalendar`. Workflow runs the fetch before Cursor generate.

**Tech Stack:** Node.js ESM (`scripts/`), existing `event-calendar-window.ts` helpers (mirror window logic in scripts or import via strip-types), `node:test`, GitHub Actions `daily-briefing.yml`, existing `CalendarEvent` schema.

**Spec:** `docs/superpowers/specs/2026-08-07-calendar-gov-earnings-design.md`

---

## File map

| Path | Responsibility |
|------|----------------|
| `web/content/calendar/earnings-watchlist.json` | Admin-edited company list |
| `web/content/calendar/README.md` | How to edit watchlist |
| `web/content/calendar/gov-fixtures.json` | Generated gov/CB rows for window |
| `web/content/calendar/earnings-fixtures.json` | Generated earnings/IPO rows for window |
| `scripts/lib/event-calendar-merge.mjs` | Window filter + dedupe + UK/EU data ban |
| `scripts/lib/event-calendar-merge.test.mjs` | Merge unit tests |
| `scripts/lib/event-calendar-fetch-bls.mjs` | Parse BLS schedule HTML → events |
| `scripts/lib/event-calendar-fetch-bls.test.mjs` | BLS parser tests (recorded HTML) |
| `scripts/lib/event-calendar-fetch-gov.mjs` | Orchestrate gov adapters (BLS + stubs/soft-fail others v1) |
| `scripts/lib/event-calendar-fetch-earnings.mjs` | Fetch IR pages for watchlist → earnings events |
| `scripts/lib/event-calendar-fetch-earnings.test.mjs` | Earnings parser tests (recorded HTML) |
| `scripts/fetch-event-calendar.mjs` | CLI: compute window, fetch, write fixtures, optional `--commit` |
| `scripts/fixtures/event-calendar/*.html` | Recorded HTML for offline tests |
| `scripts/generate-daily-briefing.mjs` | Prompt: read fixtures, ~8–20 rows |
| `.github/workflows/daily-briefing.yml` | Run fetch before generate |
| `docs/superpowers/specs/2026-08-06-event-calendar-design.md` | Cross-link density / fixtures note |

**v1 adapter scope (YAGNI):** Ship working BLS + Fed calendar parsers + earnings IR regex/heuristic for public US mega-caps; other gov hosts soft-fail with notice (extend in follow-ups). Do not invent dates when a host fails.

---

### Task 1: Merge / dedupe helpers (TDD)

**Files:**
- Create: `scripts/lib/event-calendar-merge.mjs`
- Create: `scripts/lib/event-calendar-merge.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
// scripts/lib/event-calendar-merge.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inWindow,
  eventDedupeKey,
  mergeCalendarEvents,
  stripBannedUkEuData,
} from "./event-calendar-merge.mjs";

describe("inWindow", () => {
  it("includes endpoints", () => {
    assert.equal(inWindow("2026-08-07", "2026-08-07", "2026-08-14"), true);
    assert.equal(inWindow("2026-08-14", "2026-08-07", "2026-08-14"), true);
    assert.equal(inWindow("2026-08-15", "2026-08-07", "2026-08-14"), false);
  });
});

describe("mergeCalendarEvents", () => {
  it("prefers IMAP over fixture on same dedupe key", () => {
    const imap = [{
      id: "imap-cpi",
      date: "2026-08-12",
      region: "US",
      category: "data",
      event: "US CPI (July)",
      consensus: "0.2%",
      source: { label: "Bloomberg", href: "https://www.bloomberg.com/asia" },
    }];
    const fixtures = [{
      id: "bls-cpi",
      date: "2026-08-12",
      region: "US",
      category: "data",
      event: "US CPI (July)",
      source: { label: "BLS", href: "https://www.bls.gov/schedule/2026/" },
    }];
    const merged = mergeCalendarEvents({
      windowStart: "2026-08-07",
      windowEnd: "2026-08-14",
      imapEvents: imap,
      govEvents: fixtures,
      earningsEvents: [],
    });
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "imap-cpi");
    assert.equal(merged[0].consensus, "0.2%");
  });

  it("drops UK/EU category=data", () => {
    const out = stripBannedUkEuData([
      { id: "1", date: "2026-08-10", region: "EU", category: "data", event: "EZ retail", source: { label: "x", href: "https://example.com" } },
      { id: "2", date: "2026-08-10", region: "EU", category: "central-bank", event: "ECB", source: { label: "x", href: "https://example.com" } },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].id, "2");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd /workspace/scripts && node --test lib/event-calendar-merge.test.mjs
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement merge helpers**

```js
// scripts/lib/event-calendar-merge.mjs
export function inWindow(date, windowStart, windowEnd) {
  return date >= windowStart && date <= windowEnd;
}

export function eventDedupeKey(ev) {
  const slug = String(ev.event || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${ev.date}|${ev.region}|${ev.category}|${slug}`;
}

export function stripBannedUkEuData(events) {
  return events.filter(
    (ev) =>
      !(
        (ev.region === "UK" || ev.region === "EU") &&
        ev.category === "data"
      ),
  );
}

/**
 * Prefer IMAP, then gov, then earnings. Filter to window; ban UK/EU data.
 */
export function mergeCalendarEvents({
  windowStart,
  windowEnd,
  imapEvents = [],
  govEvents = [],
  earningsEvents = [],
}) {
  const buckets = [
    ...imapEvents.map((e) => ({ e, rank: 0 })),
    ...govEvents.map((e) => ({ e, rank: 1 })),
    ...earningsEvents.map((e) => ({ e, rank: 2 })),
  ];
  const byKey = new Map();
  for (const { e, rank } of buckets) {
    if (!e?.date || !inWindow(e.date, windowStart, windowEnd)) continue;
    const key = eventDedupeKey(e);
    const prev = byKey.get(key);
    if (!prev || rank < prev.rank) byKey.set(key, { e, rank });
  }
  const merged = [...byKey.values()].map(({ e }) => e);
  return stripBannedUkEuData(merged).sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.timeBeijing || "99:99").localeCompare(b.timeBeijing || "99:99");
  });
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd /workspace/scripts && node --test lib/event-calendar-merge.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/event-calendar-merge.mjs scripts/lib/event-calendar-merge.test.mjs
git commit -m "feat: event calendar merge and dedupe helpers"
```

---

### Task 2: Watchlist JSON + README + empty fixtures

**Files:**
- Create: `web/content/calendar/earnings-watchlist.json`
- Create: `web/content/calendar/README.md`
- Create: `web/content/calendar/gov-fixtures.json`
- Create: `web/content/calendar/earnings-fixtures.json`

- [ ] **Step 1: Write watchlist with full seed list**

Include all user companies. Fields: `id`, `name`, `ticker` (nullable), `region` (`US`|`China`|`Japan`|`Other`), `irUrl` (nullable), `status` (`public`|`pre-ipo`).

Use best-known IR URLs for public names; `irUrl: null` + `status: "pre-ipo"` for OpenAI, Anthropic, Moonshot, Deepseek. SpaceX → `https://ir.spacex.com/` (or investor relations root discovered at implement time). Strategy → MicroStrategy IR. Zhipu/MiniMax/Changxin/Zhongji → HK/STAR IR pages when known.

- [ ] **Step 2: Write README** (mirror Fund tone)

```markdown
# Calendar content (admin)

Visitors never see this note on the site.

## Add / remove earnings watchlist companies

Edit `earnings-watchlist.json`, commit, deploy (or wait for next briefing-window fetch).

`status: "pre-ipo"` keeps the name on the list without inventing a report date.
Fixtures are overwritten by `node scripts/fetch-event-calendar.mjs`.
```

- [ ] **Step 3: Seed empty fixtures**

```json
{
  "fetchedAt": null,
  "windowStart": null,
  "windowEnd": null,
  "events": []
}
```

(same shape for both fixture files)

- [ ] **Step 4: Commit**

```bash
git add web/content/calendar
git commit -m "feat: add editable earnings watchlist and calendar fixture stubs"
```

---

### Task 3: BLS schedule parser (TDD + recorded HTML)

**Files:**
- Create: `scripts/fixtures/event-calendar/bls-schedule-2026-sample.html`
- Create: `scripts/lib/event-calendar-fetch-bls.mjs`
- Create: `scripts/lib/event-calendar-fetch-bls.test.mjs`

- [ ] **Step 1: Save a trimmed HTML sample** from `https://www.bls.gov/schedule/2026/` (or monthly page covering mid-August) into `scripts/fixtures/event-calendar/bls-schedule-2026-sample.html` — enough rows to include CPI / Employment Situation style lines.

- [ ] **Step 2: Write failing parser tests**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseBlsScheduleHtml } from "./event-calendar-fetch-bls.mjs";

const html = readFileSync(
  new URL("../fixtures/event-calendar/bls-schedule-2026-sample.html", import.meta.url),
  "utf8",
);

describe("parseBlsScheduleHtml", () => {
  it("extracts dated US data rows in window", () => {
    const events = parseBlsScheduleHtml(html, {
      windowStart: "2026-08-01",
      windowEnd: "2026-08-31",
    });
    assert.ok(events.length >= 1);
    for (const ev of events) {
      assert.equal(ev.region, "US");
      assert.equal(ev.category, "data");
      assert.match(ev.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(ev.source.href.includes("bls.gov"), true);
    }
  });
});
```

- [ ] **Step 3: Implement parser**

Parse table rows: US Eastern time → `timeBeijing` (+12h same calendar day for 08:30 ET → 20:30 Beijing; document the conversion helper). Map release title → `event` string. `id`: `bls-{slug}-{date}`. Vital filter: keep CPI, PPI, Employment Situation, Jobless Claims, JOLTS, Import/Export Price Indexes; drop holidays / obscure releases.

- [ ] **Step 4: Tests PASS + commit**

```bash
cd /workspace/scripts && node --test lib/event-calendar-fetch-bls.test.mjs
git add scripts/lib/event-calendar-fetch-bls.mjs scripts/lib/event-calendar-fetch-bls.test.mjs scripts/fixtures/event-calendar
git commit -m "feat: parse BLS release schedule into calendar fixtures"
```

---

### Task 4: Gov fetch orchestrator + soft-fail adapters

**Files:**
- Create: `scripts/lib/event-calendar-fetch-gov.mjs`
- Modify as needed: add small Fed HTML parser in same file or `event-calendar-fetch-fed.mjs`

- [ ] **Step 1: Implement `fetchGovFixtures({ windowStart, windowEnd, fetchImpl })`**

```js
export async function fetchGovFixtures({ windowStart, windowEnd, fetchImpl = fetch }) {
  const errors = [];
  const events = [];
  async function run(name, fn) {
    try {
      events.push(...(await fn()));
    } catch (err) {
      errors.push({ name, message: String(err?.message || err) });
    }
  }
  await run("bls", () => fetchBls(windowStart, windowEnd, fetchImpl));
  await run("fed", () => fetchFed(windowStart, windowEnd, fetchImpl));
  // v1: BEA / NBS / PBOC / BoJ / BoE / ECB — attempt fetch+parse; on failure push to errors only
  await run("bea", () => fetchBea(windowStart, windowEnd, fetchImpl));
  await run("nbs", () => fetchNbs(windowStart, windowEnd, fetchImpl));
  await run("boj", () => fetchBoj(windowStart, windowEnd, fetchImpl));
  await run("boe", () => fetchBoeCbOnly(windowStart, windowEnd, fetchImpl));
  await run("ecb", () => fetchEcbCbOnly(windowStart, windowEnd, fetchImpl));
  return { events, errors };
}
```

For v1, if a host’s HTML is unstable, implement `fetchX` as: try fetch → parse → return []; on throw, orchestrator records error. **Minimum ship bar:** BLS works; Fed returns FOMC/dated events when parseable; others may return `[]` with a console notice (no invented rows).

Fed source: `https://www.federalreserve.gov/json/ne-outgoing.json` or calendar HTML — pick whichever parses cleanly at implement time; cite Fed URL on each row. Category `central-bank`.

UK/EU adapters must only emit `category: "central-bank"`.

- [ ] **Step 2: Manual smoke**

```bash
cd /workspace && node -e "
import { fetchGovFixtures } from './scripts/lib/event-calendar-fetch-gov.mjs';
const r = await fetchGovFixtures({ windowStart: '2026-08-07', windowEnd: '2026-08-14' });
console.log('events', r.events.length, 'errors', r.errors);
"
```

Expected: `events >= 1` (BLS) or document network block; errors array for soft-fails only.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/event-calendar-fetch-gov.mjs scripts/lib/event-calendar-fetch-fed.mjs
git commit -m "feat: gov calendar fetch orchestrator with soft-fail adapters"
```

---

### Task 5: Earnings IR fetch (TDD)

**Files:**
- Create: `scripts/lib/event-calendar-fetch-earnings.mjs`
- Create: `scripts/lib/event-calendar-fetch-earnings.test.mjs`
- Create: `scripts/fixtures/event-calendar/msft-ir-sample.html` (trimmed)

- [ ] **Step 1: Record sample IR HTML** containing a clear earnings date string for Microsoft (or use a synthetic fixture matching the parser).

- [ ] **Step 2: Failing tests for `parseEarningsFromIrHtml(html, company, window)`**

- Skip `status === "pre-ipo"` companies (return []).
- Extract next earnings date in window; `category: "earnings"`; `event: "{name} earnings"`; `source.href = company.irUrl`.

- [ ] **Step 3: Implement `fetchEarningsFixtures({ watchlist, windowStart, windowEnd, fetchImpl })`**

Loop companies with `irUrl` and `status === "public"`. Soft-fail per company. Cap concurrency at 4.

- [ ] **Step 4: Tests PASS + commit**

```bash
cd /workspace/scripts && node --test lib/event-calendar-fetch-earnings.test.mjs
git add scripts/lib/event-calendar-fetch-earnings.mjs scripts/lib/event-calendar-fetch-earnings.test.mjs scripts/fixtures/event-calendar
git commit -m "feat: fetch earnings dates from IR pages for watchlist"
```

---

### Task 6: CLI `fetch-event-calendar.mjs`

**Files:**
- Create: `scripts/fetch-event-calendar.mjs`

- [ ] **Step 1: Implement CLI**

Behavior:
- Parse `--date YYYY-MM-DD` (default: Beijing today via existing slot helpers or `Intl` Asia/Shanghai).
- Compute window: copy logic from `eventWindowForBriefingDate` (duplicate small helpers in `scripts/lib/event-calendar-window.mjs` to avoid TS import friction — keep in sync with `web/src/lib/event-calendar-window.ts`).
- Load watchlist from `web/content/calendar/earnings-watchlist.json`.
- `fetchGovFixtures` + `fetchEarningsFixtures`.
- Write `gov-fixtures.json` / `earnings-fixtures.json` with `fetchedAt`, window, `events`.
- Flags: `--commit` (git add+commit fixtures like fund scan), `--dry-run` (print counts only).

Also export a `loadFixtureEvents()` for generate prompt tooling if useful.

- [ ] **Step 2: Run dry-run**

```bash
cd /workspace && node scripts/fetch-event-calendar.mjs --date 2026-08-07 --dry-run
```

- [ ] **Step 3: Run for real + commit fixtures if network works**

```bash
node scripts/fetch-event-calendar.mjs --date 2026-08-07
git add web/content/calendar/*.json scripts/fetch-event-calendar.mjs scripts/lib/event-calendar-window.mjs
git commit -m "feat: fetch-event-calendar CLI writes gov and earnings fixtures"
```

---

### Task 7: Wire workflow + generate prompt

**Files:**
- Modify: `.github/workflows/daily-briefing.yml`
- Modify: `scripts/generate-daily-briefing.mjs` (Event Calendar bullet ~line 139)
- Modify: `docs/superpowers/specs/2026-08-06-event-calendar-design.md` (density note + link to new spec)

- [ ] **Step 1: Add workflow step after inbox commit, before Fund scan**

```yaml
      - name: Fetch Event Calendar fixtures (gov + earnings)
        id: calendar
        if: steps.gate.outputs.should_run == 'true' && steps.gate.outputs.is_catchup != 'true'
        continue-on-error: true
        run: |
          set +e
          before=$(git rev-parse HEAD)
          node scripts/fetch-event-calendar.mjs --date "${{ steps.gate.outputs.briefing_date }}" --commit
          code=$?
          after=$(git rev-parse HEAD)
          set -e
          if [ "$code" -ne 0 ]; then
            echo "committed=false" >> "$GITHUB_OUTPUT"
            exit "$code"
          fi
          if [ "$before" != "$after" ]; then
            echo "committed=true" >> "$GITHUB_OUTPUT"
          else
            echo "committed=false" >> "$GITHUB_OUTPUT"
          fi
```

- [ ] **Step 2: Update generate prompt Event Calendar paragraph**

Replace density `~4–12` with `~8–20`. Require reading:

- `web/content/calendar/gov-fixtures.json`
- `web/content/calendar/earnings-fixtures.json`

Prefer IMAP, then fixtures for gaps through `windowEnd`. Earnings only from fixtures/watchlist — never invent. Point to `docs/superpowers/specs/2026-08-07-calendar-gov-earnings-design.md`.

- [ ] **Step 3: Cross-link parent event-calendar design** (one short paragraph under Generate / density).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/daily-briefing.yml scripts/generate-daily-briefing.mjs docs/superpowers/specs/2026-08-06-event-calendar-design.md
git commit -m "feat: wire calendar fixture fetch into briefing generate"
```

---

### Task 8: Verification + optional latest briefing refresh

**Files:**
- Possibly modify: latest `web/content/briefings/*.md` if doing a manual calendar fill for demo

- [ ] **Step 1: Run unit tests**

```bash
cd /workspace/scripts && node --test lib/event-calendar-merge.test.mjs lib/event-calendar-fetch-bls.test.mjs lib/event-calendar-fetch-earnings.test.mjs
```

Expected: all PASS

- [ ] **Step 2: Fetch fixtures for latest briefing date; show event counts**

- [ ] **Step 3 (optional but recommended):** Using merge helper output, update the latest briefing’s `eventCalendar.events` to IMAP ∪ fixtures (keep cites), `npm run sync-data` + `npm run scan-links` in `web/`. Only if scan-links stays green.

- [ ] **Step 4: Push branch, open/update PR, request deploy after merge**

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Editable watchlist JSON | Task 2 |
| No public edit UI | Task 2 README |
| Omit when no dated print / pre-ipo | Tasks 5–6 |
| Gov US/CN/JP + UK/EU CB-only | Tasks 3–4 |
| No TW/HK scrapers | Task 4 (not added) |
| One fetch → fixtures | Task 6 |
| Merge IMAP ∪ fixtures, dedupe, prefer IMAP | Task 1 |
| Workflow before generate | Task 7 |
| Prompt update ~8–20 rows | Task 7 |
| scan-links on sample | Task 8 |
| Never invent dates | Tasks 3–6 (soft-fail → []) |

## Placeholder scan

No TBD/TODO steps; v1 explicitly allows empty arrays for flaky gov hosts beyond BLS/Fed minimum.

## Type consistency

Fixture / merge events use the same fields as `CalendarEvent`: `id`, `date`, `timeBeijing?`, `region`, `category`, `event`, `source`, optional `consensus`/`prior`/`themeId`.
