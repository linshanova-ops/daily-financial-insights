# On-time publish (required setup)

## Why briefings were late

The generate → accuracy → merge → Pages pipeline works. What fails is **starting** it.

GitHub’s `schedule` event is **best-effort**. On 2026-07-20 it fired **zero** jobs during both the Beijing 08:00 and 20:00 windows. No amount of denser GitHub cron can guarantee on-time starts — GitHub can skip the whole window under load.

`repository_dispatch` (what we use for force catch-up) **does** start reliably. So on-time publish needs an **external clock** that pings GitHub.

## What the repo already does

| Layer | Behavior |
|-------|----------|
| Primary ticks | `:00/:15/:30/:45` at UTC 0 and 12 |
| Hourly heartbeat | `:05` every hour — publishes if a slot is still missing (up to 6h) |
| Overdue alert | Fails a workflow ~50m after the hour if still unpublished (GitHub can email you) |
| Accuracy gate | Still fail-closed — wrong content does not go live |

That recovers misses, but **true on-time** still needs the step below (~5 minutes, free).

## Required: free external cron (cron-job.org)

### 1) Create a fine-grained GitHub PAT

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate  
2. Resource owner: **linshanova-ops**  
3. Repository access: **Only select repositories** → `daily-financial-insights`  
4. Permissions → Repository permissions → **Contents: Read-only**, **Metadata: Read-only**, and under **Actions** or for `repository_dispatch` you need:
   - Actually `repository_dispatch` requires a classic PAT with `repo` scope, OR fine-grained with **Contents: Read and write** is not enough.
   
For `POST /repos/{owner}/{repo}/dispatches`, GitHub requires a token with `repo` scope (classic) or fine-grained with permission to access the repository — specifically the token needs to be able to trigger workflows. Fine-grained: **Contents: Read-only** + the repository selected often works for dispatch if the token has `workflows` - checking docs...

From GitHub docs: repository_dispatch requires authentication with `repo` scope for classic tokens. For fine-grained: "Repository permissions: Contents: Read and write" might not include dispatch. Classic PAT with `repo` is the reliable choice for a private ping token.

**Use a classic PAT with `repo` scope** (or public_repo if the repo is public — this repo is public, so `public_repo` is enough).

5. Copy the token once; store it only in cron-job.org (not in the git repo).

### 2) Create the cron job

1. Sign up at https://cron-job.org (free)  
2. Create cronjob:
   - **Title:** `syravocado briefing ping`
   - **URL:** `https://api.github.com/repos/linshanova-ops/daily-financial-insights/dispatches`
   - **Schedule:** every **5 minutes**
   - **Request method:** POST  
   - **Headers:**
     - `Accept: application/vnd.github+json`
     - `Authorization: Bearer YOUR_PAT_HERE`
     - `Content-Type: application/json`
     - `X-GitHub-Api-Version: 2022-11-28`
   - **Body:**
     ```json
     {"event_type":"refresh-briefing"}
     ```
3. Under **Execution schedule**, use custom / advanced so it only runs in:
   - **00:00–00:45 UTC** (Beijing 08:00 window)
   - **12:00–12:45 UTC** (Beijing 20:00 window)

   Or run every 5 minutes all day — the slot gate no-ops in seconds when nothing is due (cheap; public Actions minutes are free). **Beijing Sat/Sun** also no-op (weekend skip — no Cursor spend). All-day every 5 minutes is simplest and most reliable.

4. Save and run **Test** once — you should see a new Actions run within ~30s.

Without `"force":true`, the gate still prevents duplicate Cursor runs after a slot has published.

## Optional: GitHub email on overdue

1. GitHub → Settings → Notifications → Actions → enable failed workflow emails  
2. Workflow **Overdue Beijing slot alert** fails if a slot is still missing ~50 minutes after the hour

## Verify

After setup, at the next Beijing hour check:

1. Actions → **Generate daily briefing** started near `:00`  
2. PR merged with green accuracy gate  
3. https://linshanova-ops.github.io/daily-financial-insights/data/latest.json `publishedAt` is after that hour
