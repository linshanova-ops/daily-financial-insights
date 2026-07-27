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

## Sources (accuracy)

| Tier | Examples | Feed behavior |
|------|----------|---------------|
| **指定信源** | Hedgeweek RSS, HedgeCo RSS | May auto-confirm |
| **公开转载** | Bloomberg, Reuters, FT, FN London, With Intelligence | May auto-confirm |
| **弱信源** | MarketBeat 13F alerts, TradingKey ownership stubs, Ad-hoc aggregators | Never auto-confirm; usually dropped |

Cleanup: `node scripts/lib/fund-queue-clean.mjs`

## Live scan

`node scripts/scan-fund-signals.mjs` runs on Beijing briefing slots via `daily-briefing.yml`.

Google News runs **one dedicated query per monitored alias** (not OR-batched),
so quieter names are not drowned out by megafunds in the same RSS page.
Feed cards only appear when a confirmed article lands in the scan window (default 72h);
Universe listing alone does not invent news. Optional backfill:

```bash
node scripts/scan-fund-signals.mjs --window-hours 720
```
