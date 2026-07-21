# Fund content (admin)

Visitors never see this note on the site.

## Add / remove monitored funds

Edit `monitored.json`:

```json
{
  "note": "Admin only",
  "funds": [
    { "rank": 1, "name": "Citadel Investment Group" },
    { "rank": 7, "name": "Millennium Capital Partners" }
  ]
}
```

Use ranks from `universe.json`. Commit and deploy (or wait for the next briefing-window Fund scan deploy).

## Live scan

`node scripts/scan-fund-signals.mjs` runs on Beijing briefing slots via `daily-briefing.yml`.
Sources: Hedgeweek, Google News, HedgeCo.
