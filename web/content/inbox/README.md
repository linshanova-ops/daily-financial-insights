# Newsletter inbox captures

Automated Gmail IMAP fetch (GitHub Actions secrets) saves subscribed mail here
before each generate run.

| Folder | Source | Cadence |
|--------|--------|---------|
| `bloomberg-markets-daily-china/` | 彭博 Markets Daily China 中文版 | Daily (before Beijing 08:00) |
| `glassnode-insights/` | Glassnode Insights | Weekly (usually Tuesday) |

Files are markdown with YAML frontmatter (`sourceId`, `subject`, `receivedAt`, `citeHref`, …).
The generate agent merges them into existing briefing modules:

- Bloomberg matchers include **Markets Daily China** and **财经早茶** (Gmail Updates tab is fine — still INBOX/All Mail)
- **今日图表** maps to Figures as `kind: insight` with a required analysis point
- Chart images are saved under `web/public/inbox-charts/bloomberg-YYYY-MM-DD.*` and linked via figures `imageSrc`
- Glassnode matchers require Week on Chain / Insights — webinar “Now live” promos are ignored
- Bloomberg is **section-parsed** when headers exist; HTML/collapsed bodies are normalized so headers like 今日图表 stay detectable; 全球市况 is cross-check only
- Agent must **not** rewrite raw IMAP captures into “Mergeable sections” (that drops 今日图表); fetch replaces such reformatted files on the next run
- Chinese Bloomberg text must stay Chinese
- Cites use stable landing pages (never email tracking links) and appear in `keySources`
- `last-fetch.json` records ok/fail + skipped reasons for soft-fail caveats and debugging
- Evening (20:00) runs refresh the same day’s briefing when new inbox mail arrived after 08:00
