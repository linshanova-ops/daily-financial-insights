# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation on |
| Model | same as this briefing agent, or Auto |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. Cron dies in &lt;1 min (`rate-limited due to too many concurrent runs`) if a mobile/desktop chat is still RUNNING. Archive/end other agents **before** 09:00 Beijing. Do not Retry while that session is open — publish in the running agent instead. Do not add a second catch-up automation (same cap; burns tokens if 09:00 already worked).

**Prompt (paste into the existing automation — replace the old short one):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
Preflight: git fetch origin main; if web/content/briefings/$TODAY.md is already on origin/main, stop. If another agent is RUNNING, that session publishes — do not Retry.
git pull origin main first so GH inbox-sync (08:00 Beijing) Bloomberg/Glassnode captures are on disk. No IMAP in this VM; do not `gh workflow run` (403). Merge latest bloomberg-markets-daily-china on or before $TODAY — never invent 市场一览 from Yahoo.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes, 市场一览, dashboard inject, chart, calendar, Global/China/Assets/Sources).
FACT vs CLAIM. verify-briefing then PR; merge when accuracy CI is green. After merge, stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
