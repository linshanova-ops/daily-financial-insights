# Daily Financial Insights — Website

Publication layer for the Daily Financial Insights research pipeline.

## Develop

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Publish a briefing

Add a Markdown file at `content/briefings/YYYY-MM-DD.md` with the YAML frontmatter schema used by `2026-07-13.md`, then rebuild:

```bash
npm run build
npm start
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Latest briefing |
| `/briefings` | Archive |
| `/briefings/[date]` | Single day |
| `/pipeline` | Six-stage skill pipeline explainer |
