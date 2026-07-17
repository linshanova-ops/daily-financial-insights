# Twice-daily briefing schedule (remove Refresh now)

**Date:** 2026-07-17  
**Status:** Approved — implement  

## Goal

Automatically generate and publish a new briefing **twice per day** on China time (**08:00 and 20:00**, i.e. **00:00 and 12:00 UTC**). Remove the public **Refresh now** button so visitors are not asked to wait for generation.

## Behavior

1. GitHub Actions `daily-briefing.yml` runs on cron `0 0,12 * * *` plus `workflow_dispatch` (manual).
2. Keep fail-closed publish: PR → accuracy CI → auto-merge → Pages dispatch.
3. Homepage shows the latest published briefing; light feed poll may remain so open tabs pick up new publishes.
4. Remove Refresh now button, generating/rate-limit UI, and `NEXT_PUBLIC_REFRESH_API` from the Pages build.
5. Do **not** touch `web/netlify/` in this change (avoids a Netlify production deploy). Netlify refresh function may sit unused.

## Coverage rationale

- **08:00 China:** prior US cash session closed; overnight Asia  
- **20:00 China:** same-day China session closed; US cash not yet open  

## Non-goals

- Changing accuracy gate / scan-links  
- Deleting the Netlify site in this PR  
- More than two automatic runs per day  
