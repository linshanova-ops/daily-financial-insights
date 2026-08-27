# Cursor Automation — create at https://cursor.com/automations

Cursor has no create-automation API and no repo YAML sync. Save this in the dashboard. Prompt text is the skill; keep Actions `cursorAutoGenerate: false`.

| Field | Value |
|-------|--------|
| Name | Weekday 09:00 Beijing briefing |
| Trigger | Scheduled. Cron: `CRON_TZ=Asia/Shanghai 0 9 * * 1-5` (if TZ prefix is rejected: `0 1 * * 1-5` UTC) |
| Repository | `linshanova-ops/daily-financial-insights` @ `main` (required — cron defaults to no repo) |
| Tools | Pull request creation **and merge / push to main** on |
| Model | same as this briefing agent, or Auto |

**Concurrent cap:** Cursor allows one RUNNING cloud agent. Cron dies in &lt;1 min (`rate-limited due to too many concurrent runs`) if a mobile/desktop chat is still RUNNING. **Keep this dashboard automation ON** — it is the 09:00 clock. Archive leftover agents **before** 09:00 Beijing. If a chat is still open after 09:00, that session publishes (patch the same `$TODAY.md` — do not open another agent). After live confirm, **stop**. Do not add a second Cursor cron. Do not add a second IMAP cron. GH `inbox-sync.yml` fetches IMAP at this **same 09:00** (`on.push` of that file kicks that same job). `missed-briefing-catchup.yml` at 09:30 may create only if `$TODAY.md` is absent.

**Prompt (paste into the existing automation — replace the old short one):**

```
Follow `.cursor/skills/weekday-website-update/SKILL.md` (full pipeline, not inbox-only) and `/ponytail` for code.
09:00 is one publish from every source together: 财经早茶 (in Gmail since ~07:00; one 180×30s wait/pull for the same 09:00 inbox-sync; if still missing, bump `# last-kick:` in that workflow file and push — that on.push is the same job, not a second slot — then a short pull; if still missing, name IMAP miss and publish) + 见闻 + Caixin/Yicai + BlockBeats + CICC + CNBC/AP closes. Never a second 180 loop. Never a backup IMAP cron. Do not write YAML from 见闻 市场收报 while the mail is missing and patch later. $TODAY.md on main is not done unless 今日图表 / 市场一览 / 国际要闻 / 大中华 / 日程 / Themes match that mail and the other desks are in the same YAML. If this leftover wrote a 见闻-only tape, patch the same file. If another agent is RUNNING, that session publishes — do not Retry / do not create a second agent.
No IMAP in this VM; do not `gh workflow run` (403). One pass: 今日图表 (open the PNG), 市场一览, 国际要闻, 大中华, 日程 → calendar (FOMC 2pm ET = 02:00 Beijing next day), then rewrite Themes from that same mail in complete sentences, each Fact line `Cite：statement` on one line (e.g. 财经早茶 今日图表：the US Treasury General Account…). Extra FACT prints follow mail bullets. Never invent 市场一览 from Yahoo. After live $TODAY with Themes matching that mail, stop/archive so tomorrow’s 09:00 can fire.
Yahoo quote HTML is not a close print: inject levels stay in marketDashboard only.
Same quality as a manual publish: gather → world/China → CICC CLAIM (theme-then-search) → 见闻+Caixin/Yicai+BlockBeats → every website YAML section (Themes rewritten, marketOverview from mail 市场一览 with English title Markets at a glance, dashboard inject, chart, calendar, Global/China/Sources).
FACT vs CLAIM. verify-briefing then PR (ready, not draft). Wait for Briefing accuracy gate; merge to main when green (`gh pr merge`, or git merge + push main if gh is 403). Confirm live Pages `data/latest.json` date is $TODAY (dispatch Deploy syravocado to GitHub Pages if still yesterday). Then stop. Do not call generate-daily-briefing.mjs. Sat/Sun: stop.
```
