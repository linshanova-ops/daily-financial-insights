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
| **Publish mode** | **Cursor Automation, weekdays 09:00 China time.** Dashboard: [cursor.com/automations](https://cursor.com/automations) — spec in `.cursor/automations/weekday-0900-beijing.md`. GitHub `cursorAutoGenerate` stays **false** (no Actions `Agent.create`, no cron-job.org, no Netlify). |
| **Manual workflow** | Actions tab → **Generate daily briefing** → Run workflow (bypasses slot gate). |
| **Content feed** | `web/public/data/*.json` is the live feed. The homepage polls every ~60s so open tabs pick up new publishes. |
| **Deploy workflow** | After each merge to main, Pages deploys on push. Manual/dispatch also available. No schedule in manual mode. |

There is **no public Refresh now button**. Visitors always see the latest published briefing.

### Fail-closed publish (accuracy gate)

Generation does **not** push straight to `main`. Flow:

1. Cursor agent drafts on branch `briefing/YYYY-MM-DD` and opens a PR (`[skip netlify] content: publish …`)
2. Orchestrator marks the PR **ready** immediately (Cursor opens drafts; waiting on draft CI is what used to stall publishes)
3. GitHub Action **Briefing accuracy gate** runs `npm run verify-briefing` (sync-data + JSON sync check + scan-links)
4. If green → merge to `main` (weekday Cursor agent does this; generator orchestrator does it when `cursorAutoGenerate` is on) → Pages on push, or dispatch **Deploy syravocado to GitHub Pages** if `latest.json` is still yesterday (GITHUB_TOKEN merges do not fire `push` workflows)
5. If red → agent rewrites (up to 3 attempts) → re-check → merge  
6. If still failing → PR left open; **live site stays on the last good briefing**

Only one generate job runs at a time (`concurrency` group); overlapping dispatches queue instead of racing.

### Coverage of the weekday China-time slot

| China time | UTC | Mainly captures |
|------------|-----|-----------------|
| 09:00 weekdays | 01:00 | Prior **US** cash session + overnight Asia. Sat/Sun skipped. |

Monday’s briefing must cover **since Friday US cash close**, including weekend crypto and material news. Manual **Run workflow** / `force=true` still bypasses the Actions gate if you need an extra inbox fetch.

### Schedule reliability (and cost)

The clock is a **Cursor Automation** (one cloud agent per weekday). Do not turn GitHub Generate cron or cron-job.org back on — those burn tokens on empty ticks. Spec: `.cursor/automations/weekday-0900-beijing.md`.

**Cost:** one Cursor cloud-agent run on weekdays. Public-repo Actions minutes only for accuracy CI + Pages after the PR merges. No Netlify.

### Netlify — gone

Public site is **GitHub Pages only**. The Netlify project, refresh function,
and `web/netlify/` are removed. Root `netlify.toml` is an always-skip stub so
a future reconnect cannot run a Next build. Do not link this repo to Netlify
again. Briefing PRs may still say `[skip netlify]` (harmless).

### Enable briefing generation (CURSOR_API_KEY)

1. Create a Cursor API key  
2. Repo → Settings → Secrets and variables → Actions → New repository secret  
3. Name: `CURSOR_API_KEY`  
4. Wait for the next scheduled run, or **Actions → Generate daily briefing → Run workflow**

Until that secret exists, publish manually:

```bash
# add web/content/briefings/YYYY-MM-DD.md
cd web && npm run verify-briefing
git add web/content web/public/data && git commit -m "content: YYYY-MM-DD briefing" && git push
```

### Inbox newsletters (Gmail IMAP)

Before each generate run, **inbox-sync** (06:00 Beijing weekdays) fetches subscribed mail into `web/content/inbox/` using Actions IMAP secrets. The 09:00 Cursor agent merges whatever is already on `main`. Cloud agents cannot `gh workflow run` (403) and do not have IMAP env. A leftover RUNNING desktop/chat agent blocks the 09:00 cron — archive after live confirm.

Repo → Settings → Secrets and variables → Actions — set:

| Secret | Example |
|--------|---------|
| `INBOX_IMAP_HOST` | `imap.gmail.com` |
| `INBOX_IMAP_USER` | Gmail address subscribed to the newsletters |
| `INBOX_IMAP_PASSWORD` | Gmail **App Password** (not the normal login password) |
| `INBOX_IMAP_PORT` | `993` (optional; defaults to 993) |

Gmail: enable IMAP in Settings → Forwarding and POP/IMAP, and create an App Password under Google Account → Security.

Sources today:

- **彭博 Markets Daily China 中文版** (daily, before Beijing 08:00) → China / Global / Assets / Watch (section-mapped; 全球市况 does not replace Market Dashboard)
- **Glassnode Insights** (weekly, usually Tuesday) → crypto assetFramework / signals / watch  

Cites use stable landing pages only (Bloomberg Asia / Glassnode Insights tag). When used, they also appear in `keySources`. Welcome/signup mail is ignored.

Missing or failed IMAP is soft-fail — the briefing still runs; the generate prompt notes `caveats` when `last-fetch.json` reports failure. Actions logs include `[inbox] skip …` reasons (unmatched, date-mismatch, welcome, etc.).

If mail arrives after the morning run, the Beijing **20:00** generate updates the same day’s briefing.
