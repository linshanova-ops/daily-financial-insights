# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 08:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 8 * * 1-5` (if TZ prefix is rejected: `0 0 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation **and merge / push to main** on |
| Model | same as this briefing agent, or Auto |
| Dashboard | [Weekday 8 AM auto-updating website](https://cursor.com/automations/d39764a2-970d-11f1-ba66-0e7d0216e441) (`d39764a2-970d-11f1-ba66-0e7d0216e441`) — **set cron to 08:00 Asia/Shanghai**; this file does not sync |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. Cron dies in &lt;1 min (`rate-limited due to too many concurrent runs`) if a mobile/desktop chat is still RUNNING. **Keep this dashboard automation ON** — it is the 08:00 clock. Archive leftover agents **before** 08:00 Beijing. If a chat is still open after 08:00, that session publishes (patch the same `$TODAY.md` — do not open another agent). After live confirm, **stop**. Do not add a second Cursor cron. Last-kick `inbox-sync.yml` at this **same 08:00** (GH `schedule` on that file fires ~13:30 — do not wait). `missed-briefing-catchup.yml` at 09:30 may create only if `$TODAY.md` is absent.

**Prompt (paste into the existing automation — replace the old short one):**

```
CRON_TZ=Asia/Shanghai 0 8 * * 1-5

Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
08:00 is one publish from every source together: 财经早茶 (in Gmail since ~07:00; last-kick inbox-sync.yml now — bump `# last-kick:` and push — that on.push is the IMAP clock, not a second slot — then a short pull; if still missing, name IMAP miss and publish) + 见闻 + Caixin/Yicai + BlockBeats + CICC + CNBC/AP closes. Do not wait 180×30s for GH schedule. Do not invent 市场一览 from Yahoo or 见闻 市场收报. $TODAY.md on main is not done unless 今日图表 / 市场一览 / 国际要闻 / 大中华 / 日程 / Themes match that mail and the other desks are in the same YAML. If this leftover wrote a 见闻-only tape, patch the same file. If another agent is RUNNING, that session publishes — do not Retry / do not create a second agent.
No IMAP in this VM; do not `gh workflow run` (403). One pass: 今日图表 (open the PNG), 市场一览, 国际要闻, 大中华, 日程 → calendar (FOMC 2pm ET = 02:00 Beijing next day), then rewrite Themes to the skill Theme card block: one force per card; Fact lines the So what uses; FACT vs CLAIM (name the desk, never write CLAIM). Extra FACT prints follow mail bullets. After live $TODAY, stop/archive so tomorrow’s 08:00 can fire.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
verify-briefing then PR (ready, not draft). Wait for Briefing accuracy gate; merge to main when green (`gh pr merge`, or git merge + push main if gh is 403). Confirm live Pages `data/latest.json` date is $TODAY (dispatch Deploy syravocado to GitHub Pages if still yesterday). Then stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
