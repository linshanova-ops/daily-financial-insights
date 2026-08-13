---
name: weekday-website-update
description: Weekday 09:00 Asia/Shanghai website briefing. Use when a Cursor Automation (or the user) asks to publish today's syravocado briefing.
---

# Weekday website update

One cloud-agent run. Do **not** start GitHub `generate-daily-briefing.mjs`, cron-job.org, or Netlify.

If Asia/Shanghai weekday is Sat/Sun: stop. Cash markets closed.

## Do

1. Beijing date `YYYY-MM-DD` = today in `Asia/Shanghai`.
2. Inbox-first: `web/content/inbox/` (Bloomberg 财经早茶 + Glassnode if present). If IMAP secrets exist, fetch. Else `gh workflow run "Generate daily briefing"` (inbox/Fund only — `cursorAutoGenerate` stays false so this does **not** spawn another Cursor agent), wait, `git pull origin main`.
3. Follow `daily-financial-briefing` + `writing-daily-financial-report`. Inbox merge + a few primary corroborations. Do **not** run the full gather sweep unless inbox is empty.
4. Write `web/content/briefings/YYYY-MM-DD.md`. `signals: []`. Theme cards 3–5. Event calendar through next Friday.
5. `cd web && node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md && npm run verify-briefing`
6. Commit md + JSON together. PR `[skip netlify] content: publish YYYY-MM-DD daily briefing`. Merge only when Briefing accuracy gate is green. Pages deploys from `main`.

## Do not

- Second evening generate
- Extra Agent.create / nested cloud agents
- Push briefing to `main` before CI is green
---
