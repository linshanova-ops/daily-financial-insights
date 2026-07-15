# syravocado — website

Public site for the Daily Financial Insights research pipeline.

**Live URL (after GitHub Pages is enabled):**  
https://linshanova-ops.github.io/daily-financial-insights/

## Develop

```bash
cd web
npm install
npm run dev
```

## Publish a briefing

Add `content/briefings/YYYY-MM-DD.md` (see `2026-07-13.md` for the schema), merge to `main`, and the Pages workflow rebuilds the site.

## Static export

```bash
GITHUB_PAGES=true npm run build
```

Output is written to `web/out/`.
