# linshanova — permanent public site

## Permanent URL

After GitHub Pages is enabled:

**https://linshanova-ops.github.io/daily-financial-insights/**

## One-time setup (required)

This repo’s GitHub App token cannot flip Pages on for you. As the repo owner:

1. Open https://github.com/linshanova-ops/daily-financial-insights/settings/pages  
2. Under **Build and deployment → Source**, choose **GitHub Actions**  
3. Open the Actions tab → run **Deploy linshanova to GitHub Pages** (or push to `main`)

Optional custom domain: Settings → Pages → Custom domain → `linshanova.com` (or similar), then add the DNS records GitHub shows.

## How auto-updates work

| Layer | What happens |
|-------|----------------|
| **Content feed** | `web/public/data/*.json` is the live feed. The site polls GitHub raw every 60s, so new briefings appear without waiting for a full CDN rebuild. |
| **Deploy workflow** | On every push to `main` (and twice daily on a schedule), GitHub Actions rebuilds and deploys Pages. |
| **Daily briefing workflow** | Weekday cron runs a Cursor cloud agent (needs `CURSOR_API_KEY` secret) to gather news and write `web/content/briefings/YYYY-MM-DD.md`, sync JSON, and push to `main`. |

### Enable automatic daily briefings

1. Create a Cursor API key  
2. Repo → Settings → Secrets and variables → Actions → New repository secret  
3. Name: `CURSOR_API_KEY`  
4. Run **Generate daily briefing** from the Actions tab to test

Until that secret exists, publish manually:

```bash
# add web/content/briefings/YYYY-MM-DD.md
cd web && npm run sync-data
git add web/content web/public/data && git commit -m "content: YYYY-MM-DD briefing" && git push
```

## Local develop

```bash
cd web
npm install
npm run sync-data
npm run dev
```
