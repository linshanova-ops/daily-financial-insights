# Fund module — design (v1 + phase 2)

Approved 2026-07-21. Phase 2 automation added same day.

## Goal

In-site `/fund` hedge-fund monitor in syravocado style, with admin-only fund selection and **live RSS scanning on Beijing briefing windows**.

## Nav

- `SiteNav` **Fund** → `/fund` (internal)

## UI

- Compact Fund header (accent bar, display title, one subtitle, sync meta line)
- Tabs: Feed 动态 · Universe 监控基金 · Rules 校验规则
- Border-led lists (no card chrome); review queue is a simple expand under a rule
- Admin note for `monitored.json` kept minimal under Universe

## Data (`web/content/fund/`)

| File | Role |
|------|------|
| `universe.json` | Top 100 reference |
| `monitored.json` | Admin selection |
| `signals.json` | Confirmed (permanent merge) |
| `review.json` | Current review queue |
| `rules.json` | Validation rules |
| `meta.json` | Sync stamp, source status, phase |

## Phase 2 automation

- Script: `scripts/scan-fund-signals.mjs` (+ `scripts/lib/fund-signal-match.mjs`)
- Sources: Hedgeweek RSS, Google News RSS batches, With Intelligence slot (index-only until public feed)
- Window: 72h; confidence ≥75 confirmed, 45–74 review
- Confirmed hits never deleted (dedupe by title+fund)
- Wired in `.github/workflows/daily-briefing.yml` on the same slot gate as briefings (`should_run`), **without** requiring `CURSOR_API_KEY`
- `--commit` pushes Fund JSON and dispatches `deploy-pages`

## Admin add/remove

Edit `web/content/fund/monitored.json` → PR/deploy.

## Acceptance

1. Fund page elegant / on-brand  
2. Scan runs on briefing windows and refreshes content  
3. Confirmed archive grows without wiping history  
4. Unit tests for match helpers pass  
