# Welcome wave (syravocado hero greeting)

**Date:** 2026-07-17  
**Status:** Spec revised — freestanding avocado body-wave (3s); pending implementation  
**Site:** GitHub Pages (`syravocado`) — static Next export  

## Goal

On every visit to Today, a **freestanding marshmallow avocado** (no frame / plate / badge behind it) greets the reader by **waving itself for 3 seconds** with a slight grow, then returns to normal size; the welcome line disappears when those 3 seconds end — without blocking the briefing.

## Non-goals

- No full-screen splash / gate / click-to-enter
- No waving the `syr-mark.png` favicon badge
- No separate “hand-only” limb layer; the **whole avocado** waves
- No square/cream frame, card, or backing plate behind the mascot
- No Netlify / Refresh / accuracy-pipeline changes
- Not first-visit-only

## Assets

| Asset | Role |
|-------|------|
| `web/public/brand/syr-mark.png` | Favicon + header only — static |
| `web/public/brand/avocado-mascot.png` | Transparent cutout of avocado only (no background frame) |

## Behavior

1. **Where:** Today full hero only (`BriefingHero` `variant="full"`). Compact archive: no greeting.
2. **When:** Every Today load.
3. **Motion (3.0s total):**
   - Whole avocado **waves** (gentle side-to-side rock from a low pivot).
   - Slightly **scales up** during the wave, then **resumes normal size** when the 3s ends.
4. **Copy (exact):** `Welcome to syravocado — hope you enjoy today’s brief.`
5. **Copy lifecycle:** Visible during the wave; **opacity → 0 when the 3s ends** (gone, not lingering).
6. **Blocking:** None — content usable throughout.
7. **Reduced motion:** Static avocado at normal size; welcome line omitted or instantly hidden (no wave/grow).
8. **Accessibility:** Real text for the welcome line while visible; decorative mascot.

## Visual placement

- Freestanding avocado with the brand hero (no frame).
- Welcome line is secondary to brand `h1` but **a little larger** than normal body/caption (~`text-lg`–`text-xl` on desktop); fades away at t=3s.
- Existing hero atmosphere only.

## Technical notes

- CSS animation on one `<img>` (rotate + scale), duration **3000ms**, `forwards` end state = `rotate(0) scale(1)`.
- Transparent PNG cutout; respect Pages `basePath`.

## Success criteria

- [ ] Avocado only — no visible frame/plate behind it
- [ ] Whole avocado waves for **3s** (not favicon, not a detached hand)
- [ ] Slightly larger during wave; back to normal size at end
- [ ] Welcome line disappears when the 3s ends
- [ ] No gate; compact pages unchanged; reduced-motion safe

## Out of scope for v1

- Sound, i18n, header favicon wave, session memory
