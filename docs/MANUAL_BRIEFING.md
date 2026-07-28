# Manual briefing updates (token save)

## Why auto burns tokens

Each auto run called Cursor `Agent.create` with a long prompt (full skill pipeline +
large inbox dump + multi-round CI fix). That is far more expensive than editing one
briefing file. Until usage renews, **Cursor auto-generate is OFF**.

Controlled by `web/content/briefing-ops.json`:

```json
{
  "cursorAutoGenerate": false,
  "cursorAutoResumeOn": "2026-08-15"
}
```

On/after `cursorAutoResumeOn` (Beijing date), auto generate re-enables without a code change.

## What still runs (no Cursor tokens)

- Fund RSS scan on primary Beijing windows (08:00 / 20:00 catch-up excluded)
- Pages deploy when Fund content actually commits
- Site stays up; latest briefing remains until you publish a new one

## How to publish manually

1. Ask the cloud/desktop agent (or edit yourself) to update
   `web/content/briefings/YYYY-MM-DD.md` from the Bloomberg inbox under
   `web/content/inbox/` — inbox-first, minimal web corroboration.
2. From `web/`:
   - `node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md`
   - `npm run sync-data && npm run verify-briefing`
3. Commit markdown **and** `web/public/data/briefings/*.json` + `latest.json` together.
4. Open a PR → merge when Briefing accuracy gate is green.

## Emergency Cursor auto override

Only if you intentionally want Agent.create during the save window:

```json
{"event_type":"refresh-briefing","client_payload":{"force_cursor":true}}
```

Or set `BRIEFING_FORCE_CURSOR=1` when running `scripts/generate-daily-briefing.mjs` locally.

## Re-enable auto after renewal

Either wait until `cursorAutoResumeOn`, or set:

```json
{ "cursorAutoGenerate": true, "cursorAutoResumeOn": null }
```
