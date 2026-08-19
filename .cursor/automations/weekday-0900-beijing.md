# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation **and merge / push to main** on |
| Model | same as this briefing agent, or Auto |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. Cron dies in &lt;1 min (`rate-limited due to too many concurrent runs`) if a mobile/desktop chat is still RUNNING. **Keep this dashboard automation ON** — it is the 09:00 clock. Archive/end leftover agents **before** 09:00 Beijing. If a chat is still open after 09:00, that session publishes or patches. After live confirm, **stop**. Do not add a second Cursor catch-up automation (same cap). GH `inbox-sync.yml` at 09:00 fetches IMAP and **sends** only (`CATCHUP_CREATE=0`). `missed-briefing-catchup.yml` at 09:30 may create.

**Prompt (paste into the existing automation — replace the old short one):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
Preflight: git fetch + pull origin main. $TODAY.md on main is not done — stop only if 今日图表 / 市场一览 / 国际要闻 / 大中华 / 日程 / Themes already match today’s 财经早茶. If the file exists but Themes still name yesterday’s PNG or desk, rewrite Themes and patch. If another agent is RUNNING, that session publishes — do not Retry.
git pull so GH inbox-sync (09:00 Beijing, same minute) Bloomberg/Glassnode captures are on disk. Wait/pull if bloomberg-$TODAY.md is missing. No IMAP in this VM; do not `gh workflow run` (403). Merge latest bloomberg-markets-daily-china on or before $TODAY in one pass: 今日图表, 市场一览, 国际要闻, 大中华, 日程 → calendar (FOMC 2pm ET = 02:00 Beijing next day), then rewrite Themes from that same mail. Never invent 市场一览 from Yahoo. 今日图表 only if bloomberg-$TODAY.png exists. After live $TODAY with Themes matching that mail, stop/archive so tomorrow’s 09:00 can fire.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes rewritten, 市场一览, dashboard inject, chart, calendar, Global/China/Assets/Sources).
FACT vs CLAIM. verify-briefing then PR (ready, not draft). Wait for Briefing accuracy gate; merge to main when green (`gh pr merge`, or git merge + push main if gh is 403). Confirm live Pages `data/latest.json` date is $TODAY (dispatch Deploy syravocado to GitHub Pages if still yesterday). Then stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
