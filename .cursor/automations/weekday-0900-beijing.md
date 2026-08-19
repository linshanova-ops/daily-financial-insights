# Cursor Automation — create at https://cursor.com/automations

Keep this **enabled**. It is the weekday 09:00 agent. GitHub only fetches
IMAP at the same minute (cloud VMs have no IMAP secrets). Do not turn this
off — a second GitHub `Agent.create` at 09:00 is what rate-limits it.

Cursor has no create-automation API and no repo YAML sync. Save this in the
dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation **and merge / push to main** on |
| Model | same as this briefing agent, or Auto |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. Cron dies in &lt;1 min (`rate-limited due to too many concurrent runs`) if a mobile/desktop chat is still RUNNING. Archive/end other agents **before** 09:00 Beijing. If a chat is still open after 09:00 and `$TODAY.md` is missing, that session publishes. After live confirm, **stop**. Do not add a second Cursor catch-up automation (same cap). GitHub `inbox-sync.yml` at 09:00 **fetches IMAP** then **sends** the weekday prompt only if a leftover is occupying the cap (does not `Agent.create`). `missed-briefing-catchup.yml` at 09:30 is the slip backup.

**Prompt (paste into the existing automation — replace the old short one):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
Preflight: git fetch origin main; if web/content/briefings/$TODAY.md is already on origin/main, stop. If another agent is RUNNING, that session publishes — do not Retry.
git pull origin main first so GH inbox-sync (09:00 Beijing IMAP) Bloomberg/Glassnode captures are on disk. If bloomberg-$TODAY.md is missing, wait 30s and pull again (up to 2 min) — IMAP starts the same minute. No IMAP in this VM; do not `gh workflow run` (403). Merge latest bloomberg-markets-daily-china on or before $TODAY for desk copy — never invent 市场一览 from Yahoo. 今日图表 only if bloomberg-$TODAY.png exists. After live $TODAY, stop/archive this agent so tomorrow’s 09:00 can fire.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes, 市场一览, dashboard inject, chart, calendar, Global/China/Assets/Sources).
FACT vs CLAIM. verify-briefing then PR (ready, not draft). Wait for Briefing accuracy gate; merge to main when green (`gh pr merge`, or git merge + push main if gh is 403). Confirm live Pages `data/latest.json` date is $TODAY (dispatch Deploy syravocado to GitHub Pages if still yesterday). Then stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
