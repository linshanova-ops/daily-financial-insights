# syravocado — full website pipeline (agent handoff)

**Audience:** any Cursor / ChatGPT / human agent taking over site updates.  
**Live URL:** https://linshanova-ops.github.io/daily-financial-insights/  
**Repo:** `linshanova-ops/daily-financial-insights`  
**Brand:** syravocado (wine-red / mist UI)

Read this first. Then [CONTENT_ACCURACY.md](./CONTENT_ACCURACY.md), [MANUAL_BRIEFING.md](./MANUAL_BRIEFING.md), [PUBLIC_SITE.md](./PUBLIC_SITE.md).

---

## 0. Cost rule (mandatory for takeover agents)

This site burned ~$40 in one day from Task swarms + Grok Fast + a month-old agent context. **Do not repeat that.**

| Do | Do not |
|----|--------|
| One agent, one model, short branch | Spawn 8+ Task subagents / Grok Fast “factories” |
| Edit `web/content/briefings/YYYY-MM-DD.md` + sync JSON | Redesign UI unless asked |
| Run `npm run verify-briefing` once (fix until green) | Triple “code review” subagents |
| Prefer a **new/short** agent for daily updates | Reuse a huge multi-week transcript for “small” edits |
| Stop when live `latest.json` date is correct | Speculative refactors, extra docs, parallel explores |

`web/content/briefing-ops.json` currently has `cursorAutoGenerate: false` until `cursorAutoResumeOn` (see MANUAL_BRIEFING.md). **Manual publish is the default.** Fund RSS can still run without Cursor tokens.

---

## 1. What the product is

A **static Next.js site** (GitHub Pages) that publishes a **twice-daily Beijing-time financial briefing** (when auto is on) plus a separate **Fund** monitoring page.

| Layer | Path | Role |
|-------|------|------|
| UI app | `web/` | Next.js 16 App Router, `output: "export"`, Tailwind 4 |
| Authoring | `web/content/briefings/*.md` | YAML frontmatter = the briefing |
| Live feed | `web/public/data/latest.json` (+ `briefings/*.json`, `index.json`) | Homepage polls every ~60s |
| Inbox | `web/content/inbox/` | IMAP captures (Bloomberg / Glassnode) |
| Calendar fixtures | `web/content/calendar/` | Gov + earnings JSON (admin) |
| Fund data | `web/content/fund/` | Monitored names + signals (admin) |
| Orchestration | `scripts/` | Generate, IMAP, calendar fetch, Fund scan, slot gates |
| CI | `.github/workflows/` | Generate, accuracy gate, Pages deploy, overdue alert |
| Research skills | `.cursor/skills/financial-research/` | Gather → analyze → signal → write |

**Pages basePath:** `/daily-financial-insights` when `GITHUB_PAGES=true` (`web/next.config.ts`).

---

## 2. Site map (routes & nav)

Primary nav (`SiteNav`): **Today · Archive · Pipeline · Fund**

| Route | Component | Data |
|-------|-----------|------|
| `/` | `LiveHome` → `BriefingView` | Latest briefing; polls `public/data/latest.json` |
| `/briefings` | Archive list | All dated briefings |
| `/briefings/[date]` | `BriefingView` | One historical day |
| `/pipeline` | Static explainer | Research stages + source tiers (not live data) |
| `/fund` | `FundView` | `web/content/fund/*.json` |

Shell: `SiteHeader` + `SiteFooter` in `web/src/app/layout.tsx`.

---

## 3. UI design system

**Do not restyle casually.** Established language:

| Token / choice | Value |
|----------------|--------|
| Brand accent | Wine red `--forest: #7a1c28` (class name `forest` kept) |
| Ink / mist / paper | `#141012` / `#f5f0f1` / `#faf6f7` |
| Copper secondary | `#b56a3c` |
| Module accents | azure (Global), crimson (China), violet (Assets), amber, etc. |
| Display font | **Fraunces** (`--font-display`) |
| Body font | **Manrope** (`--font-sans`) |
| Atmosphere | Soft wine/copper radial gradients + light grid (`globals.css`) |
| Layout width | `max-w-6xl`, sticky skim nav |

Key files: `web/src/app/globals.css`, `web/src/lib/module-accents.ts`, hero/skim layout specs under `docs/superpowers/specs/`.

**Layout philosophy (skim → depth):**

1. **Hero** — brand + date + market tone + CTA  
2. **速览 (skim nav)** — Skim · Themes · Tape · Closes · Figures  
3. **深读 (Detail)** — Global · China · Assets · Signals · Calendar · Sources  

Implementation: `BriefingView.tsx` + `SectionNav.tsx` + `DetailTabs.tsx`.

---

## 4. Homepage section → data field → component

Source of truth for fields: `web/src/lib/types.ts`.

### 4.1 Always-on skim stack

| UI section | Frontmatter field | Component | Notes |
|------------|-------------------|-----------|--------|
| Hero | `date`, `marketTone`, `publishedAt` | `BriefingHero` | Variants: full / compact / skim |
| Executive skim | `summary[]`, `signal`, `watch`, themes peek | `ExecutiveSummary` | `#skim` |
| Themes | `themeCards[]` | `ThemeCards` | Full narrative cards; other modules **reuse**, don’t duplicate verbatim |
| Coverage line | `coverageWindow` | inline | |
| Market tape (qualitative) | `marketOverview` | `MarketOverview` | From Bloomberg **市场一览** — Chinese desk color; **not** closes |
| Market closes | `marketDashboard` | `MarketDashboard` | Injected by `fetch-market-closes.mjs` at generate time |
| Key figures | `figures[]` | `KeyFigures` | `stat` / `bars` / `insight`; Chart-of-day uses `imageSrc` under `/inbox-charts/` |
| Key sources strip | `keySources[]` | `KeySources` | Stable landing pages only |

### 4.2 Detail tabs (`DETAIL_TABS`)

| Tab | Fields | Component |
|-----|--------|-----------|
| Global | `globalRegime`, `globalChanged`, `globalImplies`, `globalTensions` | `SituationBlock` (azure) |
| China | `chinaStance`, `chinaChanged`, `chinaImplies`, `chinaDivergences` | `SituationBlock` (crimson) |
| Assets | Prefer `assetClasses[]`; fallback `assetFramework[]` | `AssetClasses` / `AssetFramework` |
| Signals | `signals[]` | `SignalList` (grade STRONG/MODERATE/WEAK) |
| Calendar | Prefer `eventCalendar`; fallback `watchItems` | `EventCalendarView` / `WatchList` |
| Sources | `sources`, `singleSource` | `SourcesCaveats` |

### 4.3 Asset classes (required shape for new briefings)

Order in UI (`AssetClasses.tsx`):

1. `us-equities`  
2. `asia-equities` — title **Asia equities**; sleeves include Golden Dragon / HK-linked **and** parallel **Japan/Korea**  
3. `rates`  
4. `fx` (USD/JPY/CNY as instrument rows)  
5. `commodities`  
6. `crypto`  

Each block: `regime` + `instruments[]` (`name`, `driver`, `driverSources`, `read`, `invalidator?`, `themeId?`).

### 4.4 Event Calendar (not narrative Watch)

Window: **briefing day → next Friday** (Friday after the Friday-on-or-after publish day). Helpers: `scripts/lib/event-calendar-window.mjs`.

| Field | Meaning |
|-------|---------|
| `windowStart` / `windowEnd` | Inclusive Beijing calendar dates |
| `events[]` | Dated rows: data / central-bank / earnings / ipo / fiscal-flow |
| `region` | `US` \| `China` \| `Japan` \| `UK` \| `EU` \| `Other` |
| China rule | **Mainland China only** on the calendar — **no Taiwan / HK** rows (strip in merge) |

Merge priority (IMAP ≻ gov fixtures ≻ earnings fixtures): `scripts/lib/event-calendar-merge.mjs`.  
Admin fixtures: `web/content/calendar/gov-fixtures.json`, `earnings-fixtures.json`, `earnings-watchlist.json`.  
Fetch: `node scripts/fetch-event-calendar.mjs` (optional `--commit`).

**Do not invent earnings** from unlabeled IR “Updated …” dates. Prefer labeled IR context; soft-fail 403 hosts.

### 4.5 Theme cards vs other modules

`themeCards` are the **only full narrative** (fact → mechanism → trigger → invalidator → horizon → status). Assets / Signals / Calendar may **link** via `themeId` and show a different insight — not a paste of the same paragraph.

---

## 5. End-to-end content pipelines

```text
┌─────────────┐   ┌──────────────────┐   ┌─────────────────────┐
│ IMAP inbox  │   │ Market closes    │   │ Calendar fixtures   │
│ Bloomberg / │   │ Yahoo etc.       │   │ gov + earnings      │
│ Glassnode   │   │ fetch-market-…   │   │ fetch-event-cal…    │
└──────┬──────┘   └────────┬─────────┘   └──────────┬──────────┘
       │                   │                        │
       └───────────────────┼────────────────────────┘
                           ▼
              web/content/briefings/YYYY-MM-DD.md
                           │
                           ▼
              web: npm run sync-data
                           │
                           ▼
              web/public/data/{latest,briefings,index}.json
                           │
                           ▼
              npm run verify-briefing  (= sync + JSON commit check + scan-links)
                           │
                           ▼
              PR → Briefing accuracy gate → merge main
                           │
                           ▼
              Deploy syravocado to GitHub Pages
                           │
                           ▼
              Live site polls latest.json (~60s)
```

### 5.A Daily briefing (manual — current default)

1. Ensure inbox is present under `web/content/inbox/` (or fetch if secrets available).  
2. Author/update `web/content/briefings/YYYY-MM-DD.md` (YAML). Inbox-first; minimal web corroboration.  
3. Inject closes:  
   `cd web && node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md`  
4. Refresh calendar fixtures if needed:  
   `node scripts/fetch-event-calendar.mjs` (from repo root / scripts as documented).  
5. `cd web && npm run verify-briefing`  
6. Commit **markdown +** `web/public/data/**` **together**.  
7. PR titled preferably with `[skip netlify]`; merge when accuracy gate green.  
8. Confirm live: `https://linshanova-ops.github.io/daily-financial-insights/data/latest.json` → `"date": "YYYY-MM-DD"`.

Details: [MANUAL_BRIEFING.md](./MANUAL_BRIEFING.md).

### 5.B Daily briefing (auto — when `cursorAutoGenerate: true`)

1. Slot gate: Beijing **08:00 / 20:00 Mon–Fri** (`scripts/briefing-slot-gate.mjs`).  
2. Optional IMAP fetch → `web/content/inbox/`.  
3. `scripts/generate-daily-briefing.mjs` → Cursor `Agent.create` on branch `briefing/YYYY-MM-DD`.  
4. Fail-closed PR → `briefing-accuracy.yml` → auto-merge → dispatch Pages.  
5. External cron recommended for true on-time: [ON_TIME_PUBLISH.md](./ON_TIME_PUBLISH.md).

Workflow: `.github/workflows/daily-briefing.yml`.

### 5.C Inbox → module mapping

| Inbox section | Briefing field |
|---------------|----------------|
| 国际要闻 / global desk | Global situation (+ themes/signals as needed) |
| 大中华 | China situation |
| 市场一览 | `marketOverview` only (never dump into Global/China prose) |
| 日程 / 央行动态 | `eventCalendar` (merge with fixtures) |
| 今日图表 | `figures[]` kind `insight` + `imageSrc` + required `analysis` |
| Glassnode weekly | Crypto theme / figure / assets — triangulate prices |

Chinese Bloomberg text **stays Chinese**. Cite stable hubs (Bloomberg Asia / Glassnode), not email tracking URLs. See `web/content/inbox/README.md`.

### 5.D Event Calendar pipeline

```text
earnings-watchlist.json ──► fetch earnings IR ──► earnings-fixtures.json ─┐
gov sources (BLS/Fed/…; BLS often via blsmon1 mirror) ──► gov-fixtures.json ─┼─► merge ──► briefing eventCalendar
IMAP 日程 (highest priority) ───────────────────────────────────────────────┘
```

China calendar = **mainland only**. Strip TW/HK in merge.

### 5.E Fund page pipeline (separate from briefing YAML)

| File | Role |
|------|------|
| `universe.json` | Ranked fund universe |
| `monitored.json` | Subset the site tracks (edit to add/remove) |
| `signals.json` / `review.json` / `meta.json` | Scan outputs |
| `rules.json` | Matching / confirmation rules |

Scan: `node scripts/scan-fund-signals.mjs` (runs on primary Beijing windows in `daily-briefing.yml`).  
Weak sources never auto-confirm. See `web/content/fund/README.md`.

### 5.F Research skills pipeline (optional depth)

Orchestrator skill: `.cursor/skills/financial-research/daily-financial-briefing/SKILL.md`

1. gathering-financial-news  
2. analyzing-global-macro  
3. analyzing-china-macro  
4. interpreting-market-signals  
5. generating-actionable-insights  
6. writing-daily-financial-report  

For **cheap daily updates**, prefer inbox → edit YAML → verify. Only run the full skill stack when quality needs deep research.

---

## 6. Accuracy gate (non-negotiable)

From `web/`:

```bash
npm run verify-briefing
```

Does:

1. `sync-data` — regenerate JSON from markdown  
2. Fail if `public/data` JSON not in sync / not what will be committed  
3. `scan-links` — every cite href + claim numbers must appear on fetchable pages  

Policy highlights ([CONTENT_ACCURACY.md](./CONTENT_ACCURACY.md)):

- Hard numbers need dated sources in the coverage window  
- Beat/miss vs **estimate**, not vs prior  
- `亿元` → bn conversion: `10亿元` = CNY1bn (never copy the 亿 numeral into `bn`)  
- Crypto: don’t publish on BlockBeats alone  
- Prefer omit over invent  
- Denylist: `web/scripts/rejected-source-ids.json`

CI: `.github/workflows/briefing-accuracy.yml` on briefing PRs.  
Deploy: `.github/workflows/deploy-pages.yml` (build also runs sync + scan-links).

---

## 7. Secrets & ops switches

| Secret / file | Purpose |
|---------------|---------|
| `CURSOR_API_KEY` | Auto `Agent.create` (off while ops say manual) |
| `INBOX_IMAP_*` | Gmail IMAP for newsletters |
| `GITHUB_TOKEN` | PR merge / dispatch (Actions) |
| `web/content/briefing-ops.json` | `cursorAutoGenerate`, `cursorAutoResumeOn` |

Force Cursor during save window only if intentional:

```json
{"event_type":"refresh-briefing","client_payload":{"force_cursor":true}}
```

---

## 8. Lean daily-update checklist (copy for other agents)

**Goal:** publish today’s briefing without wasting credits.

1. `git checkout main && git pull`  
2. New short-lived agent / clean context if history is huge  
3. Read inbox for date `YYYY-MM-DD` under `web/content/inbox/`  
4. Update **only** `web/content/briefings/YYYY-MM-DD.md` (and calendar fixtures / chart image if needed)  
5. Inject market closes  
6. Ensure `eventCalendar.windowEnd` reaches **next Friday**; mainland China only  
7. Ensure `assetClasses` includes Asia equities with Japan/Korea  
8. `cd web && npm run verify-briefing` — fix cites until green (**one** loop, not subagent army)  
9. Commit md + `web/public/data/*` (+ inbox-charts if new)  
10. PR → merge → confirm live `latest.json` date  
11. **Stop**

**Out of scope unless asked:** UI redesign, new sections, Fund universe expansion, Netlify, Task swarms.

---

## 9. Key file index

| Concern | Path |
|---------|------|
| Briefing schema | `web/src/lib/types.ts` |
| Page composition | `web/src/components/BriefingView.tsx` |
| Detail tab IDs | `web/src/lib/detail-tabs.ts` |
| Sync MD→JSON | `web/scripts/sync-briefing-data.mjs` |
| Verify publish | `web/scripts/verify-briefing-publish.mjs` |
| Scan cites | `web/scripts/scan-source-links.mjs` |
| Market closes | `web/scripts/fetch-market-closes.mjs` |
| Cursor generate | `scripts/generate-daily-briefing.mjs` |
| IMAP fetch | `scripts/fetch-inbox-sources.mjs` |
| Calendar fetch | `scripts/fetch-event-calendar.mjs` |
| Fund scan | `scripts/scan-fund-signals.mjs` |
| Design history | `docs/superpowers/specs/` |

---

## 10. Definition of done (any update)

- [ ] All existing functions still work: Today / Archive / Pipeline / Fund  
- [ ] Skim + Detail sections populated appropriately for the day  
- [ ] `eventCalendar` covers through next Friday; no TW/HK calendar rows  
- [ ] Asia equities + Japan/Korea present when Asia tape matters  
- [ ] `npm run verify-briefing` green  
- [ ] Live `latest.json` shows the intended `date`  
- [ ] No Task swarm / no unnecessary Fast-model spend  

All output is research synthesis, not investment advice.
