# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation on |
| Model | same as this briefing agent, or Auto |

**Prompt (paste):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` and `/ponytail`.
Publish today's syravocado website briefing (Beijing weekday 09:00). Inbox-first. One PR, merge when accuracy CI is green. Do not call generate-daily-briefing.mjs or spawn extra agents. If Beijing is Sat/Sun, stop.
```
