# Manual briefing updates

Twice-daily auto generate is **off**. Briefings publish only when you ask
(or run the workflow by hand).

Controlled by `web/content/briefing-ops.json`:

```json
{
  "cursorAutoGenerate": false,
  "cursorAutoResumeOn": null
}
```

`.github/workflows/daily-briefing.yml` has **no cron** — only
`workflow_dispatch` / `repository_dispatch`.

## How to publish

1. Ask an agent (or edit yourself) to update
   `web/content/briefings/YYYY-MM-DD.md` from `web/content/inbox/` —
   inbox-first, minimal web corroboration.
2. From `web/`:
   - `node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md`
   - `npm run sync-data && npm run verify-briefing`
3. Commit markdown **and** `web/public/data/briefings/*.json` + `latest.json` together.
4. Open a PR → merge when Briefing accuracy gate is green.

**Themes only:** site no longer shows a Signals / Cross-checks section.
Put the narrative in `themeCards`; keep `signals: []` on new briefings.

**Event Calendar window:** `windowEnd` = Friday after the Friday-on-or-after
briefing date (this week + next). Helper:
`eventWindowForBriefingDate` — Aug 10 → Aug 21, not Aug 14.

Optional: Actions → **Generate daily briefing** → Run workflow (inbox/Fund
helpers). Cursor `Agent.create` stays off unless `force_cursor` /
`BRIEFING_FORCE_CURSOR=1`.

## Re-enable twice-daily auto later

1. Put the cron schedules back in `.github/workflows/daily-briefing.yml`
   (see git history).
2. Set:

```json
{ "cursorAutoGenerate": true, "cursorAutoResumeOn": null }
```
