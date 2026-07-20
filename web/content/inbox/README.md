# Newsletter inbox captures

Automated Gmail IMAP fetch (GitHub Actions secrets) saves subscribed mail here
before each generate run.

| Folder | Source | Cadence |
|--------|--------|---------|
| `bloomberg-markets-daily-china/` | 彭博 Markets Daily China 中文版 | Daily (before Beijing 08:00) |
| `glassnode-insights/` | Glassnode Insights | Weekly (usually Tuesday) |

Files are markdown with YAML frontmatter (`sourceId`, `subject`, `receivedAt`, …).
The generate agent merges them into existing briefing modules. Chinese Bloomberg
text must stay Chinese.
