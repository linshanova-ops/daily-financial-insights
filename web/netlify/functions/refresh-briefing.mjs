/**
 * Public, rate-limited trigger for the Generate daily briefing workflow.
 * Requires Netlify env GITHUB_PAT (fine-grained: Actions read/write on this repo).
 * Limit: max 5 briefing generations per UTC day.
 */
const OWNER = "linshanova-ops";
const REPO = "daily-financial-insights";
const WORKFLOW_FILE = "daily-briefing.yml";
const MAX_RUNS_PER_DAY = 5;
const ALLOWED_ORIGINS = [
  "https://linshanova-ops.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function corsHeaders(origin) {
  const allow =
    origin && ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

function utcDayStart(date = new Date()) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

async function gh(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { response, data };
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: "POST required" }),
    };
  }

  const token = process.env.GITHUB_PAT || process.env.GH_WORKFLOW_TOKEN;
  if (!token) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        ok: false,
        error:
          "Refresh API not configured. Set Netlify env GITHUB_PAT (Actions: read/write).",
      }),
    };
  }

  try {
    const { response: runsRes, data: runsData } = await gh(
      `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=30`,
      { token },
    );

    if (!runsRes.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Could not read workflow runs",
          detail: runsData,
        }),
      };
    }

    const runs = runsData?.workflow_runs ?? [];
    const active = runs.find((run) =>
      ["queued", "in_progress", "waiting", "requested", "pending"].includes(
        run.status,
      ),
    );

    if (active) {
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({
          ok: true,
          status: "already_running",
          runId: active.id,
          htmlUrl: active.html_url,
          message: "A briefing update is already in progress.",
        }),
      };
    }

    const dayStart = utcDayStart();
    const todaysRuns = runs.filter((run) => {
      if (!run?.created_at) return false;
      return new Date(run.created_at).getTime() >= dayStart;
    });

    if (todaysRuns.length >= MAX_RUNS_PER_DAY) {
      const nextDay = new Date(dayStart + 24 * 60 * 60 * 1000);
      const retryAfterSec = Math.max(
        1,
        Math.ceil((nextDay.getTime() - Date.now()) / 1000),
      );
      return {
        statusCode: 429,
        headers: { ...headers, "Retry-After": String(retryAfterSec) },
        body: JSON.stringify({
          ok: false,
          status: "rate_limited",
          retryAfterSec,
          usedToday: todaysRuns.length,
          limit: MAX_RUNS_PER_DAY,
          message: `Briefings can be regenerated at most ${MAX_RUNS_PER_DAY} times per day (UTC). Try again tomorrow.`,
          lastRunAt: todaysRuns[0]?.created_at,
        }),
      };
    }

    const { response: dispatchRes, data: dispatchData } = await gh(
      `/repos/${OWNER}/${REPO}/dispatches`,
      {
        token,
        method: "POST",
        body: {
          event_type: "refresh-briefing",
          client_payload: {
            source: "website-refresh-now",
            requestedAt: new Date().toISOString(),
          },
        },
      },
    );

    if (!dispatchRes.ok) {
      // Fallback: workflow_dispatch
      const { response: wdRes, data: wdData } = await gh(
        `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
        {
          token,
          method: "POST",
          body: { ref: "main" },
        },
      );
      if (!wdRes.ok) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            ok: false,
            error: "Failed to trigger briefing workflow",
            detail: { dispatchData, wdData },
          }),
        };
      }
    }

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        ok: true,
        status: "queued",
        usedToday: todaysRuns.length + 1,
        limit: MAX_RUNS_PER_DAY,
        message: `Briefing refresh queued (${todaysRuns.length + 1}/${MAX_RUNS_PER_DAY} today). The live feed will update when generation finishes.`,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: err?.message ?? "Unexpected refresh error",
      }),
    };
  }
}
