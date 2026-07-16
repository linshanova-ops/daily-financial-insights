# Visual briefing UX — implementation plan

> **For agentic workers:** implement task-by-task.

**Goal:** Make briefings more visual and scannable with accurate figures, section navigation, and clearer interactions.

**Architecture:** Author-defined `figures[]` in frontmatter → `KeyFigures` SVG UI; sticky `SectionNav`; compact hero; collapsible lists; focus/nav/refresh polish.

**Tech Stack:** Next.js App Router, React 19, Tailwind 4, gray-matter YAML figures.

## Tasks
1. Types + figures on 2026-07-16 briefing
2. KeyFigures component
3. SectionNav + section ids + compact hero + collapsible lists
4. focus-visible, skip link, active nav, refresh UI
5. Build / commit / PR
