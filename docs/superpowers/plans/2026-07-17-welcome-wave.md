# Welcome wave Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** On every Today load, show a freestanding avocado that waves and slightly grows for 3s, with a clear welcome line that disappears at 3s — no splash gate.

**Architecture:** A small client component (`WelcomeWave`) owns the CSS animation. `BriefingHero` renders it only for `variant="full"`. Asset is `web/public/brand/avocado-mascot.png` (transparent cutout). Favicon `syr-mark.png` stays static in the header.

**Tech Stack:** Next.js App Router, CSS keyframes, `next/image` static import (Pages `basePath`-safe).

---

### Task 1: WelcomeWave component + CSS

**Files:**
- Create: `web/src/components/WelcomeWave.tsx`
- Modify: `web/src/app/globals.css` (keyframes)
- Modify: `web/src/components/BriefingHero.tsx`

- [ ] Add `@keyframes avocado-wave` (3s rotate + scale) and `@keyframes welcome-line-fade` in `globals.css`
- [ ] Create client `WelcomeWave` with large clear avocado + `text-xl`/`text-2xl` welcome line
- [ ] Mount in full `BriefingHero` above the brand title
- [ ] `prefers-reduced-motion`: no wave; hide welcome line
- [ ] Build / visual check; commit; push PR
