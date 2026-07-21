# Morning Skim Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Today briefing page as a morning skim (compact hero → skim → markets → Detail tabs) without removing or rewriting any briefing content.

**Architecture:** Layout-only React changes. A pure `detailTabFromHash` helper maps URL hashes to Detail tab ids. `DetailTabs` wraps existing section components and show/hides panels. `SectionNav` becomes a two-row sticky chrome (primary anchors + Detail tab triggers). `BriefingView` reorders bands; Today home uses a new `skim` hero variant. No markdown schema or generate pipeline changes.

**Tech Stack:** Next.js App Router, React 19 client components, Tailwind 4, existing `node:test` for the hash helper (no Vitest/RTL in `web/`).

**Spec:** `docs/superpowers/specs/2026-07-21-morning-skim-layout-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| Create: `web/src/lib/detail-tabs.ts` | Tab id type, tab list metadata, `detailTabFromHash(hash)` |
| Create: `web/src/lib/detail-tabs.test.mjs` | node:test for hash → tab mapping |
| Create: `web/src/components/DetailTabs.tsx` | Client tablist + panels; renders existing section components |
| Modify: `web/src/components/SectionNav.tsx` | Primary: Skim/Tape/Closes/Figures/Detail; second row = Detail tab links |
| Modify: `web/src/components/BriefingView.tsx` | Reorder: hero → skim → since-last → nav → coverage → markets → DetailTabs |
| Modify: `web/src/components/BriefingHero.tsx` | Add `skim` variant (brand, no wave, no `min-h-[88vh]`); CTAs → `#skim` / markets |
| Modify: `web/src/components/LiveHome.tsx` | Pass `heroVariant="skim"` |
| Modify: `web/src/components/ExecutiveSummary.tsx` | Wrap/mark `#skim`; tighten padding slightly |
| Unchanged: SituationBlock, AssetFramework, SignalList, WatchList, SourcesCaveats, Market*, KeyFigures, KeySources, content/ | Content preserved |

---

### Task 1: Hash → Detail tab helper (TDD)

**Files:**
- Create: `web/src/lib/detail-tabs.ts`
- Create: `web/src/lib/detail-tabs.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// web/src/lib/detail-tabs.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detailTabFromHash, DETAIL_TABS } from "./detail-tabs.ts";

describe("detailTabFromHash", () => {
  it("defaults to global for empty or unknown hash", () => {
    assert.equal(detailTabFromHash(""), "global");
    assert.equal(detailTabFromHash("#"), "global");
    assert.equal(detailTabFromHash("#nope"), "global");
  });

  it("maps section hashes to tabs", () => {
    assert.equal(detailTabFromHash("#global-situation"), "global");
    assert.equal(detailTabFromHash("#china-situation"), "china");
    assert.equal(detailTabFromHash("#asset-framework"), "assets");
    assert.equal(detailTabFromHash("#signals"), "signals");
    assert.equal(detailTabFromHash("#watch"), "watch");
    assert.equal(detailTabFromHash("#sources"), "sources");
    assert.equal(detailTabFromHash("#detail"), "global");
  });

  it("accepts bare ids without hash", () => {
    assert.equal(detailTabFromHash("china-situation"), "china");
  });

  it("exposes six tabs in order", () => {
    assert.deepEqual(
      DETAIL_TABS.map((t) => t.id),
      ["global", "china", "assets", "signals", "watch", "sources"],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /workspace/web && node --test src/lib/detail-tabs.test.mjs`

Expected: FAIL (module not found / export missing)

- [ ] **Step 3: Write minimal implementation**

```ts
// web/src/lib/detail-tabs.ts
export type DetailTabId =
  | "global"
  | "china"
  | "assets"
  | "signals"
  | "watch"
  | "sources";

export const DETAIL_TABS: ReadonlyArray<{
  id: DetailTabId;
  label: string;
  hashes: readonly string[];
}> = [
  { id: "global", label: "Global", hashes: ["global-situation", "detail"] },
  { id: "china", label: "China", hashes: ["china-situation"] },
  { id: "assets", label: "Assets", hashes: ["asset-framework"] },
  { id: "signals", label: "Signals", hashes: ["signals"] },
  { id: "watch", label: "Watch", hashes: ["watch"] },
  { id: "sources", label: "Sources", hashes: ["sources"] },
];

const HASH_TO_TAB: Record<string, DetailTabId> = Object.fromEntries(
  DETAIL_TABS.flatMap((tab) => tab.hashes.map((h) => [h, tab.id])),
) as Record<string, DetailTabId>;

/** Map location.hash or bare id to a Detail tab. Unknown → global. */
export function detailTabFromHash(hash: string): DetailTabId {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return "global";
  return HASH_TO_TAB[id] ?? "global";
}
```

Note: If `node --test` cannot import `.ts` directly in this repo, either:
- rename implementation to `web/src/lib/detail-tabs.mjs` (plain JS + JSDoc), or
- run via `node --experimental-strip-types` (Node 22+). Prefer strip-types if available; otherwise use `.mjs` twin exported API matching the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /workspace/web && node --experimental-strip-types --test src/lib/detail-tabs.test.mjs`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/detail-tabs.ts web/src/lib/detail-tabs.test.mjs
git commit -m "feat: map briefing hashes to Detail tab ids"
```

---

### Task 2: `DetailTabs` client component

**Files:**
- Create: `web/src/components/DetailTabs.tsx`
- Modify: none yet (wire in Task 4)

- [ ] **Step 1: Implement `DetailTabs`**

Client component that:
- Reads `window.location.hash` on mount + `hashchange`
- Sets active tab via `detailTabFromHash`
- Renders `role="tablist"` buttons from `DETAIL_TABS`
- ArrowLeft/ArrowRight move focus/selection among tabs
- Renders **all** panels in the DOM; inactive panels use `hidden` + `aria-hidden`
- Children are passed as a render map or as explicit props for each existing section — prefer **props that are already-built React nodes** from `BriefingView` to avoid duplicating SituationBlock config:

```tsx
// web/src/components/DetailTabs.tsx
"use client";

import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  DETAIL_TABS,
  detailTabFromHash,
  type DetailTabId,
} from "@/lib/detail-tabs";

export type DetailTabPanels = Record<DetailTabId, ReactNode>;

interface DetailTabsProps {
  panels: DetailTabPanels;
}

export function DetailTabs({ panels }: DetailTabsProps) {
  const baseId = useId();
  const [active, setActive] = useState<DetailTabId>("global");

  useEffect(() => {
    const sync = () => setActive(detailTabFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function selectTab(id: DetailTabId, syncHash: boolean) {
    setActive(id);
    if (!syncHash) return;
    const hash = DETAIL_TABS.find((t) => t.id === id)?.hashes[0];
    if (hash) {
      const next = `#${hash}`;
      if (window.location.hash !== next) {
        history.replaceState(null, "", next);
      }
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + DETAIL_TABS.length) % DETAIL_TABS.length;
    const tab = DETAIL_TABS[next];
    selectTab(tab.id, true);
    document.getElementById(`${baseId}-tab-${tab.id}`)?.focus();
  }

  return (
    <section id="detail" className="scroll-mt-28">
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
          Detail
        </p>
        <h2 className="display mt-2 text-3xl tracking-tight text-ink sm:text-4xl">
          Full briefing modules
        </h2>
        <div
          role="tablist"
          aria-label="Briefing detail modules"
          className="mt-6 flex gap-1 overflow-x-auto border-b border-line pb-px"
        >
          {DETAIL_TABS.map((tab, index) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={`focus-ring shrink-0 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                  selected
                    ? "border-b-2 border-forest text-forest"
                    : "text-ink-soft hover:text-forest"
                }`}
                onClick={() => selectTab(tab.id, true)}
                onKeyDown={(e) => onTabKeyDown(e, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {DETAIL_TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={!selected}
          >
            {panels[tab.id]}
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/DetailTabs.tsx
git commit -m "feat: add DetailTabs wrapper for briefing modules"
```

---

### Task 3: Two-row sticky `SectionNav`

**Files:**
- Modify: `web/src/components/SectionNav.tsx`

- [ ] **Step 1: Replace nav items and add Detail tab row**

Primary row only:

```ts
const primary = [
  { href: "#skim", label: "Skim" },
  { href: "#market-overview", label: "Tape" },
  { href: "#market-dashboard", label: "Closes" },
  { href: "#key-figures", label: "Figures" },
  { href: "#detail", label: "Detail" },
];
```

Filter Tape/Closes/Figures by existing `has*` props (same as today).

Second row: map `DETAIL_TABS` to links `#global-situation`, `#china-situation`, etc. (first hash of each tab). Clicking these relies on browser hash + `DetailTabs` `hashchange` listener. Style as a second sticky strip:

```tsx
<nav
  aria-label="Briefing sections"
  className="sticky top-0 z-20 border-b border-line/80 bg-mist/90 backdrop-blur-md"
>
  <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">
    {/* primary anchors */}
  </div>
  <div
    aria-label="Detail modules"
    className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto border-t border-line/60 px-5 py-1.5 sm:px-8"
  >
    {DETAIL_TABS.map((tab) => (
      <a
        key={tab.id}
        href={`#${tab.hashes[0]}`}
        className="focus-ring shrink-0 px-3 py-1 text-xs font-semibold tracking-wide text-ink-soft transition-colors hover:text-forest"
      >
        {tab.label}
      </a>
    ))}
  </div>
</nav>
```

Both rows stay sticky together (`top-0` on the outer `<nav>`). Mobile: horizontal scroll on each row (already `overflow-x-auto`).

- [ ] **Step 2: Commit**

```bash
git add web/src/components/SectionNav.tsx
git commit -m "feat: skim/markets SectionNav with Detail tab row"
```

---

### Task 4: Reorder `BriefingView` (no content dropped)

**Files:**
- Modify: `web/src/components/BriefingView.tsx`

- [ ] **Step 1: Rebuild composition order**

Target JSX order:

1. `BriefingHero` (variant from props)
2. `<div id="skim" className="scroll-mt-28">` wrapping `ExecutiveSummary` (and optional skim CTAs if not in hero)
3. `SinceLastBriefing` when `changesSincePrevious` present
4. `SectionNav` (with has* flags)
5. Coverage window line
6. `MarketOverview` / `MarketDashboard` / `KeyFigures` / `KeySources` (same conditionals as today)
7. `DetailTabs` with `panels` built from existing components:

```tsx
<DetailTabs
  panels={{
    global: (
      <SituationBlock
        id="global-situation"
        eyebrow="Global situation"
        title="World regime and today's delta"
        stanceLabel="Regime"
        stance={briefing.globalRegime}
        changed={briefing.globalChanged}
        implies={briefing.globalImplies}
        tensionsLabel="Tensions"
        tensions={briefing.globalTensions}
        accent="azure"
        band
      />
    ),
    china: (
      <SituationBlock
        id="china-situation"
        /* same props as today */
      />
    ),
    assets: briefing.assetFramework?.length ? (
      <AssetFramework assets={briefing.assetFramework} />
    ) : null,
    signals: <SignalList signals={briefing.signals} />,
    watch: <WatchList items={briefing.watchItems} />,
    sources: (
      <SourcesCaveats
        sources={briefing.sources}
        singleSource={briefing.singleSource}
      />
    ),
  }}
/>
```

Do **not** omit any former section. Keep all imports that remain used.

- [ ] **Step 2: Commit**

```bash
git add web/src/components/BriefingView.tsx
git commit -m "feat: reorder Today briefing into skim, markets, Detail tabs"
```

---

### Task 5: `skim` hero + Today wiring + skim band polish

**Files:**
- Modify: `web/src/components/BriefingHero.tsx`
- Modify: `web/src/components/LiveHome.tsx`
- Modify: `web/src/components/ExecutiveSummary.tsx`

- [ ] **Step 1: Add `skim` variant to hero**

Extend props: `variant?: "full" | "compact" | "skim"`.

Behavior:
- `skim`: no `min-h-[88vh]`, **no** `WelcomeWave`, brand `h1` = `syravocado` + “Daily Financial Insights” (same copy as full, smaller type scale e.g. `text-4xl sm:text-5xl`), date eyebrow, published, `marketTone`, CTAs:
  - primary → `#skim` label “Today’s skim”
  - secondary stay pipeline link; optional tertiary → `#market-overview` “Markets”
- `compact`: unchanged (archive date title)
- `full`: leave intact for safety but unused on Today after Step 2

- [ ] **Step 2: `LiveHome` passes skim**

```tsx
<BriefingView
  briefing={briefing}
  heroVariant="skim"
  previousDate={previousDate}
  changesSincePrevious={changes}
  publishedAtFallback={publishedAt}
/>
```

Archive `briefings/[date]/page.tsx` keeps `heroVariant="compact"`.

- [ ] **Step 3: Tighten Executive Summary padding for skim**

In `ExecutiveSummary.tsx`, change outer section padding from `py-14` to `py-10` (or `pt-8 pb-10`). Keep `id="executive-summary"` for back-compat; parent `#skim` is the nav target.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/BriefingHero.tsx web/src/components/LiveHome.tsx web/src/components/ExecutiveSummary.tsx
git commit -m "feat: compact skim hero on Today and tighter summary band"
```

---

### Task 6: Verify build + acceptance checklist

**Files:** none new (verification only)

- [ ] **Step 1: Run unit tests**

Run: `cd /workspace/web && node --experimental-strip-types --test src/lib/detail-tabs.test.mjs`

Expected: PASS

- [ ] **Step 2: Lint + build**

Run:

```bash
cd /workspace/web && npm run lint && npm run build
```

Expected: lint clean (or only pre-existing issues); `next build` succeeds.

If `prebuild` scan-links fails on network, run `npx next build` after `npm run sync-data` only when offline constraints require it; prefer full `npm run build` when egress allows.

- [ ] **Step 3: Manual acceptance (desktop + ~375px width)**

Against latest briefing content:

1. First viewport shows brand + tone + skim takeaways (not near-full-screen hero alone).
2. Market color, closes, figures, key sources visible without opening a tab.
3. Detail tabs default to Global; switching tabs shows China / Assets / Signals / Watch / Sources with prior copy intact.
4. `#china-situation` (and other hashes) opens the matching tab.
5. Sticky chrome shows primary row + Detail tab row on mobile.
6. Signals/Watch internal “show more” still works inside their tabs.
7. No briefing fields removed from the page.

- [ ] **Step 4: Commit any polish fixes, push, update PR**

```bash
git push -u origin HEAD
```

Use branch `Shanova/morning-skim-layout-9ba4` for implementation (or continue on the spec branch if already implementing there). Open/update PR against `main` with layout-only summary and link to the design spec.

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Compact/skim hero, no tall first viewport | Task 5 |
| Skim band = Executive Summary + Signal + Watch | Task 4–5 |
| Since last under Skim | Task 4 |
| Markets always visible + Key sources with Figures | Task 4 |
| Detail tabs Global…Sources, default Global | Task 1–2, 4 |
| Hash deep links select tab | Task 1–2 |
| Sticky SectionNav + second tab row (mobile) | Task 3 |
| No content/schema/pipeline changes | All tasks (layout only) |
| Build for GitHub Pages | Task 6 |

## Out of scope (do not do)

- Rewriting briefing markdown or prompts
- Removing WelcomeWave from archive unless it already uses compact
- Netlify refresh UI changes
- Collapsing Market color / Closes into tabs
