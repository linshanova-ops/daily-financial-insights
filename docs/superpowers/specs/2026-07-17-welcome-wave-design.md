# Welcome wave (syravocado hero greeting)

**Date:** 2026-07-17  
**Status:** Approved in conversation; pending user review of this spec before implementation  
**Site:** GitHub Pages (`syravocado`) — static Next export  

## Goal

On every visit, greet the reader with a short wave of the marshmallow avocado mark and one welcome line — without blocking or delaying access to the briefing.

## Non-goals

- No full-screen splash / gate / click-to-enter
- No Netlify involvement (Pages-only UI)
- No change to Refresh, accuracy gate, or briefing content pipeline
- Not a first-visit-only flow (user chose every open)

## Behavior

1. **Where:** Full hero on **Today** (`variant="full"` in `BriefingHero`). Compact archive heroes keep the mark quiet (no wave / no welcome line) so archive pages stay content-first.
2. **When:** Every load of Today (including hard refresh and return visits).
3. **Motion:** Marshmallow avocado (`public/brand/syr-mark.png`, same asset as favicon/header) plays a short **arm-wave** (~1.5–2.0s), then settles to rest.
4. **Copy (exact):**  
   `Welcome to syravocado — hope you enjoy today’s brief.`
5. **Copy lifecycle:** Line appears with the wave and **fades out** as the wave ends (or shortly after). It must not compete with the brand `h1` or `marketTone` after the greeting finishes.
6. **Blocking:** Briefing content, CTAs, and scroll remain available for the entire greeting. No overlay that captures clicks.
7. **Reduced motion:** If `prefers-reduced-motion: reduce`, show the static mark and the welcome line once (no wave animation); line may remain briefly then fade, or stay as a static soft subtitle for one beat — prefer fade without motion keyframes.
8. **Accessibility:** Welcome line is real text (not only in an image). Decorative motion does not require a live region announcement. Mark has appropriate alt / is marked decorative if adjacent text already names the brand.

## Visual placement

- Brand-first: mark sits with the **syravocado** hero identity (above or beside the display title — implementer’s choice as long as the first viewport still reads as one composition: brand, one headline stack, market tone, CTA).
- Welcome line is secondary to the brand name (smaller, softer color from existing tokens — e.g. `text-ink-soft` / forest muted). No pill, badge, card, or floating sticker on hero media.
- Atmosphere stays the existing hero gradients; do not add a second full-bleed “splash” plane.

## Technical notes

- Prefer CSS animation (or a tiny client component) over heavy libraries.
- If the mark is a still PNG, wave via transform origin on a wrapper (rotate/wiggle of the whole mark is acceptable for v1); SVG limb split is optional later.
- Reuse `syr-mark.png`; do not introduce a second mascot asset unless the PNG cannot read as a wave.
- Keep GitHub Pages `basePath` in mind for any image URLs (same pattern as `SiteHeader`).

## Success criteria

- [ ] Every Today load shows a ~1.5–2s wave + the exact welcome line
- [ ] No gate; content readable/clickable throughout
- [ ] Compact briefing pages unchanged (no greeting)
- [ ] `prefers-reduced-motion` disables the wave
- [ ] Desktop and mobile first viewport still pass the brand-first / one-composition rules

## Out of scope for v1

- Sound
- Localized welcome strings
- Wave on header mark for non-Today pages
- Persisting “already waved this session” (user asked every open)
