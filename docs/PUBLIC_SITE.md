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
| **Twice-daily schedule** | Capture & publish for **08:00 and 20:00 Beijing (GMT+8)**. GitHub cron fires **every minute** during `00:00–00:44` and `12:00–12:44` UTC. Slot gate: start **at/after** the hour, max **+45 minutes** (absorbs cron skips), skip if that slot already published. Morning = first publish; evening = same-day refresh (inbox + Market Dashboard). Accuracy CI → auto-merge → Pages deploy (retried). |
| **Manual** | Actions tab → **Generate daily briefing** → Run workflow (bypasses slot gate). |
| **Content feed** | `web/public/data/*.json` is the live feed. The homepage polls every ~60s so open tabs pick up new publishes. |
| **Deploy workflow** | After each merge the orchestrator dispatches Pages (with retries). Safety-net cron at `:50` UTC also redeploys. |

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
| 20:00 | 12:00 | Same-day **China** session (closed 15:00); US cash not yet open |

Generate starts **at/after** 08:00 / 20:00 Beijing so Market Dashboard and news reflect that clock; max start delay **45 minutes** (on-time target still the top of the hour). Manual **Run workflow** bypasses the gate. External `repository_dispatch` without `force` uses the same gate; `client_payload.force=true` forces a run (catch-up).

Evening runs always refresh the same Beijing date even when morning already published (new inbox + fresh Market Dashboard).

### Schedule reliability (and cost)

GitHub’s `schedule` event is **best-effort** and can skip short windows (this caused the missed 2026-07-20 08:00 Beijing publish). Mitigations in-repo:

1. **Dense cron** — every minute for **45 minutes** after each Beijing hour (not all-day `*/5`)
2. **Slot skip-if-done** — once morning or evening publishes, later ticks no-op in seconds
3. **Pages deploy retries** — merge fails the job if deploy cannot be dispatched (so you notice)
4. **Optional free external ping** — [cron-job.org](https://cron-job.org) free tier (or similar) POSTs `repository_dispatch` during those windows (recommended belt-and-suspenders)

**Cost:** Public-repo GitHub Actions minutes are free. External cron free tier is **$0**. **No Netlify credits** (Actions + Pages only; briefing PRs are `[skip netlify]`). Cursor API usage still applies when a generate actually runs (one morning + one evening when slots fire).

Example free backup (GitHub PAT with `repo` scope as a secret on the cron service — not committed):

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_PAT" \
  https://api.github.com/repos/linshanova-ops/daily-financial-insights/dispatches \
  -d '{"event_type":"refresh-briefing"}'
```

Schedule that curl every 1–5 minutes at **00:00–00:44 UTC** and **12:00–12:44 UTC** only. Without `"force":true`, the slot gate still prevents off-window Cursor runs.

### Netlify credits

Scheduled generate / dispatch polls **do not use Netlify credits**. Briefing PRs are titled `[skip netlify]`, Deploy Previews are ignored, and production Netlify builds skip unless `web/netlify.toml` / `web/netlify/` change. Public site deploys are **GitHub Pages**.

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

### Inbox newsletters (Gmail IMAP)

Before each generate run, Actions fetches subscribed mail into `web/content/inbox/` and the agent merges it into existing modules (not a new page). Chinese Bloomberg text stays Chinese.

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
