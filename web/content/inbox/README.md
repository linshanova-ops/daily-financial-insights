# Newsletter inbox captures

Automated Gmail IMAP fetch (GitHub Actions secrets) saves subscribed mail here
before each generate run.

| Folder | Source | Cadence |
|--------|--------|---------|
| `bloomberg-markets-daily-china/` | 彭博 Markets Daily China 中文版 | Daily (before Beijing 08:00) |
| `glassnode-insights/` | Glassnode Insights | Weekly (usually Tuesday) |

Files are markdown with YAML frontmatter (`sourceId`, `subject`, `receivedAt`, `citeHref`, …).
The generate agent merges them into existing briefing modules:

- Bloomberg is **section-parsed** (国际要闻 → global, 大中华 → china, etc.); 全球市况 is cross-check only
- Chinese Bloomberg text must stay Chinese
- Cites use stable landing pages (never email tracking links) and appear in `keySources`
- `last-fetch.json` records ok/fail + skipped reasons for soft-fail caveats and debugging
- Evening (20:00) runs refresh the same day’s briefing when new inbox mail arrived after 08:00
