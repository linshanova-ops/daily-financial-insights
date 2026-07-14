# Daily Financial Insights Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Next.js website that publishes Daily Financial Insights briefings produced by the existing skill pipeline.

**Architecture:** Build-time Markdown loader under `content/briefings/` feeds App Router pages. Home shows the latest briefing; archive and detail routes cover history; `/pipeline` explains the six skill stages. Presentation only — no live agent execution.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, `gray-matter`, `remark`/`remark-html` (or lightweight custom section parser), Google Fonts (Fraunces + Manrope).

---

## File map

| Path | Responsibility |
|------|----------------|
| `package.json` / `next.config.ts` / `tsconfig.json` / `tailwind` config | App scaffold |
| `content/briefings/2026-07-13.md` | Seed briefing |
| `src/lib/briefings.ts` | Load/parse/sort briefings |
| `src/lib/types.ts` | Briefing types |
| `src/app/layout.tsx` | Root shell, fonts, nav |
| `src/app/globals.css` | Design tokens, atmosphere, motion |
| `src/app/page.tsx` | Latest briefing home |
| `src/app/briefings/page.tsx` | Archive |
| `src/app/briefings/[date]/page.tsx` | Single briefing |
| `src/app/pipeline/page.tsx` | Pipeline explainer |
| `src/components/*` | Hero, sections, signals, watch, archive row |
| `README.md` | Update with website usage |

---

### Task 1: Scaffold Next.js app

- [ ] Create Next.js + TS + Tailwind project in repo root (or `web/` if conflict — prefer root since repo is skills-only)
- [ ] Add deps: `gray-matter`, `remark`, `remark-html`
- [ ] Verify `npm run build` empty app works
- [ ] Commit

### Task 2: Content model + seed briefing

- [ ] Add `content/briefings/2026-07-13.md` with frontmatter + full briefing body
- [ ] Implement `src/lib/types.ts` and `src/lib/briefings.ts` (list, getLatest, getByDate)
- [ ] Unit-smoke via node script or build import
- [ ] Commit

### Task 3: Design system + layout shell

- [ ] CSS variables, fonts, atmospheric background in `globals.css`
- [ ] Site header/nav + footer with disclaimer stub
- [ ] Commit

### Task 4: Briefing UI components + home

- [ ] Build Hero, ExecutiveSummary, SituationBlock, SignalList, WatchList, SourcesCaveats
- [ ] Wire `/` to latest briefing
- [ ] Commit

### Task 5: Archive, detail, pipeline pages

- [ ] `/briefings`, `/briefings/[date]`, `/pipeline`
- [ ] Empty/404 states
- [ ] Commit

### Task 6: Polish, README, verify

- [ ] Motion, mobile pass, accessibility basics
- [ ] Update README
- [ ] `npm run build` + local smoke
- [ ] Push + PR
