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
| **Refresh now** | Visitors click **Refresh now** → Netlify function rate-limits and dispatches **Generate daily briefing** → Cursor agent gathers sources, publishes Markdown/JSON to `main` → site polls the live feed until content changes. |
| **Content feed** | `web/public/data/*.json` is the live feed (GitHub raw). The homepage also polls every 15s after publish. |
| **Deploy workflow** | On every push to `main`, GitHub Actions rebuilds and deploys Pages. |

There is **no weekday 4-hour cron** for briefings. Updates are on-demand (plus manual Actions runs).

### Enable on-demand Refresh now (required)

GitHub Pages is static, so the click trigger lives on a tiny Netlify function.

1. **Create a fine-grained GitHub PAT**
   - Resource owner: your account / org that owns the repo  
   - Repository access: only `daily-financial-insights`  
   - Permissions: **Actions → Read and write**  
   - Copy the token

2. **Connect Netlify to this repo**
   - https://app.netlify.com/start → import `linshanova-ops/daily-financial-insights`  
   - Build settings are already in `netlify.toml` (`base = web`)

3. **Netlify → Site configuration → Environment variables**
   - `GITHUB_PAT` = the PAT from step 1

4. **Deploy the Netlify site** (push to `main` or Trigger deploy). Copy the function URL:  
   `https://<your-site>.netlify.app/.netlify/functions/refresh-briefing`

5. **GitHub → Settings → Secrets and variables → Actions → Variables**
   - Name: `NEXT_PUBLIC_REFRESH_API`  
   - Value: the function URL from step 4

6. Re-run **Deploy syravocado to GitHub Pages** (or push to `main`) so the static site embeds that URL.

7. Open the site → **Refresh now**. You should see “Generating…” then an updated briefing (usually several minutes). Rate limit: **max 5 refreshes per UTC day**.

### Enable briefing generation (CURSOR_API_KEY)

1. Create a Cursor API key  
2. Repo → Settings → Secrets and variables → Actions → New repository secret  
3. Name: `CURSOR_API_KEY`  
4. Click **Refresh now** on the site (or run **Generate daily briefing** from the Actions tab)

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
