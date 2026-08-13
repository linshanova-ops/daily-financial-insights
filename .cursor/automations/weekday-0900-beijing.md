# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation on |
| Model | same as this briefing agent, or Auto |

**Prompt (paste into the existing automation — replace the old short one):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes, 市场一览, dashboard inject, chart, calendar, Global/China/Assets/Sources).
FACT vs CLAIM. verify-briefing then PR; merge when accuracy CI is green. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
