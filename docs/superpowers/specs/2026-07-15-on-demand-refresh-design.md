# On-demand briefing refresh (design)

## Problem

`Refresh now` only re-fetches `latest.json`. New briefings still depend on the weekday 4-hour cron, so visitors cannot force an update from the site.

## Goal

Anyone clicking **Refresh now** requests a fresh briefing generation. The 4-hour schedule is removed.

## Constraints

- Site is static GitHub Pages (`output: "export"`) — no same-origin API routes.
- Triggering `workflow_dispatch` needs a server-side GitHub token (never embed a PAT in the browser).
- Full Cursor briefing runs are expensive — must rate-limit.

## Approach

1. **Netlify Function** `refresh-briefing` (CORS-enabled) accepts public POSTs, rate-limits to one run / 30 minutes, and dispatches the existing Generate daily briefing workflow via `repository_dispatch` / `workflow_dispatch` using server secret `GITHUB_PAT`.
2. **LiveHome** on Refresh now: call that endpoint → show “Generating…” → poll the live JSON feed until `index.generatedAt` / briefing content changes (or timeout).
3. **Remove** the weekday 4-hour cron from `daily-briefing.yml`; keep `workflow_dispatch` + `repository_dispatch`.
4. **Config:** `NEXT_PUBLIC_REFRESH_API` points the static site at the Netlify function URL.

## Rate limit

- If a briefing workflow is queued/in-progress, return that status (do not start another).
- If the last successful/failed run finished < 30 minutes ago, return 429 and keep polling the feed.

## Setup (one-time)

1. Connect the repo to Netlify (functions deploy from `web/`).
2. Create a fine-grained PAT with **Actions: Read and write** on this repo; set Netlify env `GITHUB_PAT`.
3. Set GitHub Actions variable / Pages build env `NEXT_PUBLIC_REFRESH_API` to  
   `https://<site>.netlify.app/.netlify/functions/refresh-briefing`.
