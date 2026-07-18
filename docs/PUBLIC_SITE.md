# syravocado — permanent public site

## Permanent URL

**https://linshanova-ops.github.io/daily-financial-insights/**

## One-time setup (required)

This repo’s GitHub App token cannot flip Pages on for you. As the repo owner:

1. Open https://github.com/linshanova-ops/daily-financial-insights/settings/pages  
2. Under **Build and deployment → Source**, choose **GitHub Actions**  
3. Open the Actions tab → run **Deploy syravocado to GitHub Pages** (or push to `main`)

Optional custom domain: Settings → Pages → Custom domain → `syravocado.com` (or similar), then add the DNS records GitHub shows.

## How updates work

| Layer | What happens |
|-------|----------------|
| **Twice-daily schedule** | GitHub Actions runs **Generate daily briefing** at **08:00 and 20:00 China time** (`0 0,12 * * *` UTC). Cursor agent drafts on `briefing/YYYY-MM-DD`, accuracy CI must pass, then auto-merge + Pages deploy. |
| **Manual** | Actions tab → **Generate daily briefing** → Run workflow (rare overrides). |
| **Content feed** | `web/public/data/*.json` is the live feed. The homepage polls every ~60s so open tabs pick up new publishes. |
| **Deploy workflow** | On push to `main` (and after briefing merge dispatch), GitHub Actions rebuilds and deploys Pages. |

There is **no public Refresh now button**. Visitors always see the latest published briefing.

### Fail-closed publish (accuracy gate)

Generation does **not** push straight to `main`. Flow:

1. Cursor agent drafts on branch `briefing/YYYY-MM-DD` and opens a PR (`[skip netlify] content: publish …`)
2. Orchestrator marks the PR **ready** immediately (Cursor opens drafts; waiting on draft CI is what used to stall publishes)
3. GitHub Action **Briefing accuracy gate** runs `npm run sync-data` + `npm run scan-links`
4. If green → orchestrator auto-merges → explicitly dispatches **Deploy syravocado to GitHub Pages** (GITHUB_TOKEN merges do not fire `push` workflows)
5. If red → agent rewrites (up to 3 attempts) → re-check → merge  
6. If still failing → PR left open; **live site stays on the last good briefing**

Only one generate job runs at a time (`concurrency` group); overlapping dispatches queue instead of racing.

### Coverage of the two China-time slots

| China time | UTC | Mainly captures |
|------------|-----|-----------------|
| 08:00 | 00:00 | Prior **US** cash session (already closed) + overnight Asia |
| 20:00 | 12:00 | Same-day **China** session (closed 15:00); US cash not open yet |

### Netlify (optional / legacy)

Netlify is **not required** for the public site. An old refresh-bridge function may still exist under `web/netlify/`; the Pages site no longer calls it. Avoid promoting `*.netlify.app`. Do not re-enable a full Next build on Netlify. Leave `web/netlify/` untouched unless you intentionally want a Netlify production deploy (15 credits).

### Enable briefing generation (CURSOR_API_KEY)

1. Create a Cursor API key  
2. Repo → Settings → Secrets and variables → Actions → New repository secret  
3. Name: `CURSOR_API_KEY`  
4. Wait for the next scheduled run, or **Actions → Generate daily briefing → Run workflow**

Until that secret exists, publish manually:

```bash
# add web/content/briefings/YYYY-MM-DD.md
cd web && npm run sync-data
git add web/content web/public/data && git commit -m "content: YYYY-MM-DD briefing" && git push
```
