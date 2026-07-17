# Welcome wave (syravocado hero greeting)

**Date:** 2026-07-17  
**Status:** Spec revised — avocado-only hand wave (3s); pending implementation  
**Site:** GitHub Pages (`syravocado`) — static Next export  

## Goal

On every visit to Today, the **marshmallow avocado mascot** (not the SYR favicon badge) greets the reader by **waving one hand for 3 seconds**, with one welcome line — without blocking the briefing.

## Non-goals

- No full-screen splash / gate / click-to-enter
- No waving / rocking the `syr-mark.png` favicon badge (SYR letters + mark) as a substitute
- No Netlify involvement (Pages-only UI)
- No change to Refresh, accuracy gate, or briefing content pipeline
- Not a first-visit-only flow (user chose every open)

## Assets

| Asset | Role |
|-------|------|
| `web/public/brand/syr-mark.png` | Favicon + header only — **unchanged, does not wave** |
| `web/public/brand/avocado-mascot.png` | Hero mascot body (avocado only) |
| `web/public/brand/avocado-arm.png` (or equivalent layered piece) | Waveable hand/arm layered on the mascot |

If a single layered SVG/PNG composite is cleaner, that is fine as long as **only the hand/arm moves**, not the whole SYR badge.

## Behavior

1. **Where:** Full hero on **Today** (`variant="full"` in `BriefingHero`). Compact archive heroes: no wave / no welcome line.
2. **When:** Every load of Today (including hard refresh and return visits).
3. **Motion:** Avocado’s **hand waves for 3.0 seconds**, then settles to a rest pose. Wave should read as a greeting (arm pivots from the shoulder), not a whole-body tilt of the logo.
4. **Copy (exact):**  
   `Welcome to syravocado — hope you enjoy today’s brief.`
5. **Copy lifecycle:** Line appears with the wave and **fades out** as the 3s wave ends (or within ~0.3s after). It must not compete with the brand `h1` or `marketTone` afterward.
6. **Blocking:** Briefing content, CTAs, and scroll remain available throughout. No click-capturing overlay.
7. **Reduced motion:** If `prefers-reduced-motion: reduce`, show static avocado at rest + welcome line once (no hand animation); prefer a simple opacity fade for the line only.
8. **Accessibility:** Welcome line is real text. Decorative motion needs no live region. Mascot `alt=""` if brand name is adjacent, or short alt naming the mascot.

## Visual placement

- Brand-first: avocado sits with the **syravocado** hero identity (above or beside the display title) so the first viewport remains one composition: brand, headline stack, market tone, CTA.
- Welcome line is secondary (smaller, softer token colors). No pill, badge, card, or sticker overlay language.
- Atmosphere: existing hero gradients only.

## Technical notes

- Prefer CSS (layered arm + `transform-origin` at shoulder) or a tiny client component; no heavy animation libraries.
- Respect GitHub Pages `basePath` for image URLs (same pattern as `SiteHeader`).
- Wave duration constant: **3000ms**.

## Success criteria

- [ ] Viewer perceives the **avocado’s hand** waving (not the favicon badge rocking)
- [ ] Wave runs **~3 seconds** on every Today load, then rests
- [ ] Exact welcome line appears and fades with the wave
- [ ] No gate; content usable throughout
- [ ] Compact pages unchanged
- [ ] `prefers-reduced-motion` disables the hand wave
- [ ] Desktop and mobile still pass brand-first / one-composition rules

## Out of scope for v1

- Sound
- Localized welcome strings
- Wave on header favicon mark
- Session “already waved” memory
