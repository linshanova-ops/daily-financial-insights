# Manual briefing updates

Twice-daily auto generate is **off**. Briefings publish only when you ask.

`web/content/briefing-ops.json`:

```json
{
  "cursorAutoGenerate": false,
  "cursorAutoResumeOn": null
}
```

Generate workflow has **no cron** — `workflow_dispatch` / `repository_dispatch` only.

## How to publish

1. Update `web/content/briefings/YYYY-MM-DD.md` (inbox-first).
2. From `web/`: inject closes → `npm run verify-briefing`.
3. Commit markdown + `web/public/data/**` together; merge when accuracy gate is green.
