# Visual briefing UX — design

Approved 2026-07-16.

## Goals
1. Tame long briefing scroll (section index, compact archive hero, collapsible lists).
2. Fix interaction basics (focus-visible, active nav, honest refresh feedback).
3. Add accurate key figures: author-defined `figures[]` only; never invent numbers.

## Figures schema
Optional `figures` on briefing frontmatter:

- `id`, `title`, `kind: "stat" | "bars"`
- `display` / `delta` for stats
- `points: [{ label, value }]` for bars (numeric for scale)
- `unit?`, `note?`, `source: { label, href }`

UI: Key figures strip after coverage; hide if empty. SVG bars, wine/cream palette.

## Layout / interaction
- Sticky section nav; section `id`s on major blocks
- Compact hero on archive detail (`variant="compact"`)
- Collapsible lists for since-last / signals / watch (default show 4–5)
- Global `:focus-visible`; skip link; active nav via `usePathname`
- Refresh: phase labels + rate-limit countdown + clearer helper copy
