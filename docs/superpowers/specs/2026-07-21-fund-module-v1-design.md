# Fund module (v1) — design

Approved 2026-07-21. Ship Approach 1 now; Approach 3 (live scanner) is phase 2.

## Goal

Rebuild Fund Signal（对冲基金信息监控）**inside** syravocado at `/fund`, opened from the upper-right **Fund** nav item (no external jump). Match syravocado visual language. Admin-only add/remove of monitored funds via committed content.

## Non-goals (v1)

- Live crawl of Hedgeweek / With Intelligence / Reuters
- Real “立即同步” that fetches fresh hits
- Visitor-facing edit UI for fund selection
- Pixel-perfect clone of Fund Signal chrome

## Reader / admin model

- **Visitors:** browse 动态 / 监控基金 / 校验规则 on `/fund`
- **Admin:** edit `web/content/fund/*.json` → PR → Pages deploy

## Nav

- `SiteNav` **Fund** → `/fund` (internal `Link`, not external URL)

## Page structure

In-page tabs:

1. **动态** — metrics + confirmed signals + collapsible review queue  
2. **监控基金** — monitored roster table (search + strategy filter) + admin note for editing `monitored.json`  
3. **校验规则** — rule cards from `rules.json`

Meta line: last updated from `meta.json`. Sync button omitted or labeled phase 2.

## Data (`web/content/fund/`)

| File | Role |
|------|------|
| `universe.json` | Top 100 reference roster |
| `monitored.json` | Admin selection (`funds: [{rank,name},…]`) |
| `signals.json` | Confirmed hits |
| `review.json` | Review / low-confidence queue |
| `rules.json` | Validation rules |
| `meta.json` | updatedAt, source status, phase note |

**Add/remove:** edit `monitored.json` (and `universe.json` if needed).

## Phase 2 → Approach 3

Keep UI; add scheduled scanner that writes `signals.json` / `review.json` / `meta.json`. Enable real sync.

## Acceptance (v1)

1. Fund nav opens `/fund` in-site  
2. Three tabs work with seeded content  
3. Monitored list reflects `monitored.json`  
4. Style matches syravocado (not external theme)  
5. No dependency on fund-signal-top50 host for page render  
