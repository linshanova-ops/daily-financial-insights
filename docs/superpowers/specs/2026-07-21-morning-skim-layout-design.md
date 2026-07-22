# Morning skim layout — design

Approved direction 2026-07-21 (brainstorming).

## Goal

Make the Today briefing feel like a **morning skim** instead of a long research dump, without removing or rewriting any briefing content. Same markdown/JSON fields; new layout and reveal order only.

## Non-goals

- No content cuts (no dropping Global/China bullets, assets, signals, watch, sources, figures, market color, or closes).
- No briefing schema or generate-prompt changes.
- No inbox / cron / Pages pipeline changes.
- No archive list redesign (archive **detail** uses the same layout family).
- No brand palette / typeface overhaul.

## Reader model

1. **Skim** — what matters today (judgment).
2. **Markets** — desk tape still visible (color, closes, figures).
3. **Detail on demand** — long narrative modules via tabs.

## Page structure (Today)

Top → bottom:

1. **Compact hero** — brand `syravocado`, date, published time, one-line `marketTone`. No `min-h-[88vh]`. Today uses `BriefingHero` `compact` (or equivalent). Omit the tall Welcome wave on Today so skim starts in the first viewport; archive detail may keep its current compact hero.
2. **Skim band** (`#skim`) — full Executive Summary bullets + Signal + Watch (existing fields, unchanged copy). Primary in-page CTAs to Markets / Detail.
3. **Since last briefing** — removed (was redundant with Skim / Detail). Replaced by a quiet previous-briefing archive link under Skim.
4. **Sticky SectionNav** — anchors: Skim · Tape · Closes · Figures · Detail.
5. **Coverage window** line (unchanged).
6. **Markets stack (always visible)** — Market color → Market closes → Figures → Key sources (key sources stay with figures, not tabbed away).
7. **Detail tabs** (`#detail`) — one panel with tabs:
   - Global | China | Assets | Signals | Watch | Sources
   - Each tab renders the **existing** component(s) with the same data:
     - Global → `SituationBlock` (global)
     - China → `SituationBlock` (china)
     - Assets → `AssetFramework`
     - Signals → `SignalList` (keep internal show-more)
     - Watch → `WatchList` (keep internal show-more)
     - Sources → `SourcesCaveats`
   - Default tab: **Global**
   - Hash / deep links select the matching tab and scroll to `#detail` (e.g. `#china-situation`, `#signals`, `#watch`, `#sources-caveats`, asset section id if present).

## Navigation behavior

- Tab strip is **always** sticky under the main SectionNav whenever Detail tabs exist (not only when Detail is scrolled into view).
- **Mobile:** second sticky row under the primary SectionNav (horizontal scroll OK).
- Desktop: same two-row pattern (SectionNav + Detail tabs).
- “Detail” nav item scrolls to `#detail`.
- Specific hashes open the corresponding tab then scroll.
- Keyboard: arrow keys between tabs; `aria-selected` / `role="tablist"`; focus moves into the active panel.
- Prefer show/hide panels in the DOM (not route changes) so content remains complete for a single static page.

## Visual density

- Keep wine / copper / paper, Manrope + Fraunces, module accent bars.
- Tighten section padding in skim + markets (`py-14` → ~`py-10`); Detail panel interiors stay readable.
- Do not card-ify the hero; no detached promo badges on hero media.
- One job per band: Skim = judgment; Markets = tape; Detail = narrative modules.

## Code touchpoints

| Area | Change |
|------|--------|
| `BriefingView` | Reorder into Skim → quiet prior link → Markets → Detail tabs |
| `BriefingHero` | Today uses compact (drop full-viewport height on home) |
| `ExecutiveSummary` | Remains the skim body (may live inside a skim wrapper) |
| `PreviousBriefingLink` | One-line archive link under Skim (replaces Since-last list) |
| New `DetailTabs` (name flexible) | Thin wrapper; renders existing section components |
| `SectionNav` | Skim / Tape / Closes / Figures / Detail; mobile second row for tabs |
| Briefing content / generate scripts | **No change** |

## Acceptance criteria

1. All briefing content sections remain reachable with identical text, figures, cites, and lists (the auto “what changed” list is intentionally removed as redundant with Skim/Detail).
2. First viewport on Today reads as brand + short tone + skim takeaways (not a near-full-screen hero alone).
3. Market color, closes, and figures remain visible without opening a tab.
4. Global / China / Assets / Signals / Watch / Sources are tabbed, default Global; deep links still work.
5. Mobile shows SectionNav + tab strip as two sticky rows.
6. No generate/inbox/schema regressions; site still builds for GitHub Pages.

## Implementation note

Ship as a layout-only PR on the website. Verify on desktop and mobile widths against a live briefing (e.g. latest `2026-07-21` content) that every module still appears under its tab and that markets stay above Detail.
