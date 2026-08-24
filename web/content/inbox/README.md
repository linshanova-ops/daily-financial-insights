# Newsletter inbox captures

Automated Gmail IMAP fetch saves subscribed mail here. GitHub Actions
`inbox-sync.yml` runs at **08:00 Beijing** weekdays (IMAP secrets live in
Actions, not in the Cursor 09:00 VM). 财经早茶 arrives ~07:00–07:40 — one
fetch, then the 09:00 agent maps that file. Do not fetch again at 09:00.

| Folder | Source | Cadence |
|--------|--------|---------|
| `bloomberg-markets-daily-china/` | 彭博 Markets Daily China 中文版 | Daily (before Beijing 09:00) |
| `glassnode-insights/` | Glassnode Insights | Weekly (usually Tuesday) |

Files are markdown with YAML frontmatter (`sourceId`, `subject`, `receivedAt`, `citeHref`, …).
The generate agent merges them into existing briefing modules:

- Bloomberg matchers include **Markets Daily China** and **财经早茶** (Gmail Updates tab is fine — still INBOX/All Mail)
- **今日图表** maps to Figures as `kind: insight` with a required analysis point
- Chart images are saved under `web/public/inbox-charts/bloomberg-YYYY-MM-DD.*` and linked via figures `imageSrc`
- Glassnode matchers require Week on Chain / Insights — webinar “Now live” promos are ignored
- Bloomberg is **section-parsed** when headers exist; HTML/collapsed bodies are normalized so headers like 今日图表 stay detectable; 全球市况 is cross-check only
- Generate must merge **all** sections (国际要闻 + 大中华 + 市场一览 + 日程/央行动态 + 今日图表) then **rewrite Themes** from that same mail — not China-only cherry-picks and not yesterday’s Theme titles with a patched fact line
- **市场一览** maps to frontmatter `marketOverview` (UI title **Markets at a glance**, after Closes) — never dump into Global/China prose; do not put the Chinese mail header on the page; **见闻「市场收报」is not 市场一览**
- Agent must **not** rewrite raw IMAP captures into “Mergeable sections” (that drops 今日图表); fetch replaces such reformatted files on the next run
- Chinese Bloomberg text must stay Chinese
- Cites use stable landing pages (never email tracking links) and appear in `keySources`
- `last-fetch.json` records ok/fail + skipped reasons for soft-fail caveats and debugging
- Evening (20:00) runs refresh the same day’s briefing when new inbox mail arrived after 08:00
