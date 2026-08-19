# Cursor Automation — leave **disabled**

GitHub `inbox-sync.yml` is the weekday clock: IMAP fetch then
`nudge-missed-briefing.mjs` at 09:00 Beijing. A dashboard cron at the same
minute races that fetch (agent clones before `$TODAY` mail is on `main`) and
dies on the concurrent cap when a leftover is RUNNING.

Cursor has no create-automation API and no repo YAML sync. If you still keep
a dashboard automation, save this there. Actions `cursorAutoGenerate` stays
**false**.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | **Off.** GH `0 1 * * 1-5` UTC is 09:00 Beijing. Do not also run `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` here. |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` |
| Tools | Pull request creation **and merge / push to main** on |
| Model | same as this briefing agent, or Auto |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. GH 09:00 **sends**
the weekday prompt to a leftover occupying the cap (does not `Agent.create` a
second run). `missed-briefing-catchup.yml` at 09:30 is the slip backup. If a
chat is still open after 09:00 and `$TODAY.md` is missing, that session
publishes. After live confirm, **stop**. Do not add a second Cursor catch-up
automation.

**Prompt (same text GH nudge / 09:30 send uses as the weekday instruction):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
Preflight: git fetch origin main; if web/content/briefings/$TODAY.md is already on origin/main, stop. If another agent is RUNNING, that session publishes — do not Retry.
git pull origin main first so GH inbox-sync (09:00 Beijing IMAP-then-nudge) Bloomberg/Glassnode captures are on disk. No IMAP in this VM; do not `gh workflow run` (403). Merge latest bloomberg-markets-daily-china on or before $TODAY for desk copy — never invent 市场一览 from Yahoo. 今日图表 only if bloomberg-$TODAY.png exists. After live $TODAY, stop/archive this agent so tomorrow’s 09:00 can fire.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes, 市场一览, dashboard inject, chart, calendar, Global/China/Assets/Sources).
FACT vs CLAIM. verify-briefing then PR (ready, not draft). Wait for Briefing accuracy gate; merge to main when green (`gh pr merge`, or git merge + push main if gh is 403). Confirm live Pages `data/latest.json` date is $TODAY (dispatch Deploy syravocado to GitHub Pages if still yesterday). Then stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
