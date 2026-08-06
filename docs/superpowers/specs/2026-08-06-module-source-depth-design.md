# Module source depth + Watch radar design

## Goal

Upgrade syravocado so modules are fed by the right sources and publish **in-depth analysis**, not raw news dumps. Capture expands (ChainCatcher, BlockBeats, 华尔街见闻, CICC); Global/China stay Bloomberg-email-native; Asset / Signals / Watch get clearer jobs.

## Locked framework (approved direction)

| Module | Primary sources | Job |
|--------|-----------------|-----|
| **Global** | Bloomberg daily email (国际要闻 + related) | Chinese 1:1 changed facts + implies / tensions |
| **China** | Bloomberg daily email (大中华新闻 + related) | Chinese 1:1 changed facts + implies / divergences |
| **By asset** (`assetFramework`) | After fetch: **华尔街见闻**, **BlockBeats**, **ChainCatcher**, **CICC** (+ closes / Glassnode where relevant) | In-depth per-asset regime → driver → read → invalidator |
| **Signals** | Multi-source synthesis | **Ongoing risks** + **current signals** — multi-day themes with trigger / invalidation |
| **Watch** | Calendar from Bloomberg + desk items from asset-source radar | **Event calendar** + **by desk** boards |

Supporting modules unchanged in role:

| Module | Role |
|--------|------|
| Tape (`marketOverview`) | Bloomberg 市场一览 qualitative color |
| Closes (`marketDashboard`) | Snapshot prints at generate time |
| Figures | 今日图表 / Glassnode insight |
| Fund | Separate RSS universe (Hedgeweek / HedgeCo / allowlist) |

## Product thesis

- syravocado remains a **judgment product**.
- Every promoted item needs **fact → mechanism → watch** (trigger + invalidator).
- Global/China are **not** the dumping ground for WS/BlockBeats/ChainCatcher/CICC headlines.
- Those four sources deepen **asset** and **signals**; Watch is the forward radar.

## Source roles

| Source | Capture | Allowed use |
|--------|---------|-------------|
| Bloomberg IMAP | Existing inbox fetch | Global, China, Tape, calendar → Watch events, 今日图表 |
| Glassnode IMAP | Existing weekly | BTC regime evidence; optional crypto Watch / signals |
| ChainCatcher RSS | New: `https://www.chaincatcher.com/rss/clist` → `web/content/inbox/chaincatcher/` | Crypto / Web3 inputs to **asset (BTC)** + crypto desk Watch + signal evidence |
| BlockBeats | Structured sweep / gather (existing cite + denylist) | Narrow crypto desk: BTC, ETF, MSTR/Strategy, stables, exchanges, regulation |
| 华尔街见闻 | Structured fetch/gather (existing hub + year/denylist gates) | Cross-asset tape color and drivers for **assetFramework** (not Global/China spine) |
| CICC skill | Daily research queries via `APP_ID`/`APP_SECRET` → inbox capture | China / industry / macro **research depth** for asset rows + signal mechanisms |

## Module designs

### Global / China

- **Spine = Bloomberg email only** (current section map).
- Do not replace 国际要闻 / 大中华新闻 bullets with WS/CC/BB/CICC rewrites.
- Optional: one sourced crypto-macro line in Global **only** when it changes the global regime and is triangulated; still not a crypto wire.

### By asset (in-depth after fetch)

Keep the eight-asset framework. After capture, the generate step must rewrite each row with depth from WS / BlockBeats / ChainCatcher / CICC (plus closes):

```text
regime → driver (sourced) → read → invalidator
```

Mapping guidance:

| Asset | Prefer |
|-------|--------|
| US equities / Treasuries / USDJPY / Gold / Oil | 华尔街见闻 + closes; CICC when macro-linked |
| China equities / CNY | CICC research + 华尔街见闻; Bloomberg China for hard prints only via China module |
| BTC | ChainCatcher + BlockBeats (+ Glassnode weekly); triangulate hard numbers |

UI: existing Asset Framework tab; stronger driverSources; no new card layout.

### Signals (in-depth)

Signals become explicitly two families (same `signals[]` array, distinguished by naming/status conventions or a light `kind` field if needed):

1. **Current signal** — active tape theme (graded STRONG/MODERATE/WEAK).
2. **Ongoing risk** — multi-day theme carried across briefings until invalidated.

Required shape (existing fields, enforced harder):

- `evidence` (sourced)
- `mechanism`
- `disprovedIf` (= invalidation)

Rules:

- Prefer multi-day continuity (`continuing` language in name/evidence when carried).
- No single-headline signals without a cross-asset mechanism.
- Cap roughly 4–6 total (current + ongoing).

### Watch (event calendar + by desk)

Two blocks inside `#watch`:

**A. Event calendar** (table)

| Field | Source |
|-------|--------|
| date / time (Beijing when known) | Bloomberg 日程 / 央行动态 |
| event | same |
| focus | agent one-liner |
| desk | tag |

**B. By desk** (lists, not cards)

Desks (fixed order):

1. US / global equities  
2. China / HK equities  
3. Rates / credit  
4. FX  
5. Commodities  
6. Crypto  

Each desk item: headline, why, watch, **trigger**, **invalidator**, horizon, status, source chip.  
Cap ~2–3 items per desk. Fed by asset-source radar (WS/BB/CC/CICC) + Bloomberg calendar themes — not a raw RSS list.

#### Schema (minimal)

```ts
type WatchDesk =
  | "us-global-equities"
  | "china-hk-equities"
  | "rates-credit"
  | "fx"
  | "commodities"
  | "crypto";

interface WatchItem {
  // existing fields…
  desk?: WatchDesk;          // required for new briefings
  kind?: "calendar" | "desk"; // calendar rows vs desk radar
  sources?: FactSource[];    // optional cite chips
}
```

Older briefings without `desk`/`kind` still render as today’s flat list (backward compatible).

## Capture pipeline

```text
fetch-inbox (Bloomberg, Glassnode)
fetch-chaincatcher-rss          → inbox/chaincatcher/YYYY-MM-DD.md
fetch/sweep wallstreetcn        → inbox/wallstreetcn/… (or structured bundle)
fetch/sweep blockbeats (narrow) → inbox/blockbeats/…
run-cicc-research (1–2 queries) → inbox/cicc/…
scan-fund-signals (unchanged)
generate-daily-briefing (prompt map below)
```

### Generate prompt map

1. 国际要闻 → `globalChanged` / implies / tensions (**Bloomberg only**)  
2. 大中华新闻 → `chinaChanged` / implies / divergences (**Bloomberg only**)  
3. WS + BlockBeats + ChainCatcher + CICC → deepen `assetFramework×8`  
4. Same pool → `signals[]` as ongoing risks + current signals (trigger/invalidation)  
5. Bloomberg 日程/政策 → Watch **calendar**; desk boards from asset-source radar  
6. 市场一览 → Tape; closes inject; 今日图表 → figures  

Fail-closed: scan-links, denylists, no invented levels, crypto triangulation.

## Website UX

- **Watch tab**: calendar table on top; desk sections below; source chips; keep priority colors.  
- **Signals tab**: subtle grouping or labels for “Current” vs “Ongoing risk” (minimal chrome).  
- **Assets tab**: unchanged layout; richer sourced drivers.  
- **Global / China**: unchanged structure.  
- **Sources / Pipeline**: document the framework table above.  
- No hero clutter; no card grids; Fund untouched.

## Non-goals

- Replacing Bloomberg Global/China with aggregator wires  
- Full reference-site clone (no three-column archive redesign in this spec)  
- Committing API secrets  
- Live visitor-side fetching of WS/CC/BB/CICC  

## Phases

| Phase | Deliverable |
|-------|-------------|
| **P1** | ChainCatcher RSS capture + Watch schema/UI (calendar + desks) + generate prompt map |
| **P2** | BlockBeats narrow sweep + 华尔街见闻 bundle into asset/signals depth |
| **P3** | CICC daily research capture → China-linked assets + signal mechanisms |
| **P4** | Signals UI “current vs ongoing” polish + Sources/Pipeline docs |

## Success criteria

- Global/China bullets remain Bloomberg-faithful.  
- Asset rows cite WS/BB/CC/CICC where they actually drive the read.  
- Signals read as multi-day themes with clear invalidators.  
- Watch shows dated calendar + desk boards, not an unread RSS feed.  
- CI `scan-links` / verify-briefing stay green.
