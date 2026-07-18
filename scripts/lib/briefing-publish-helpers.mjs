/**
 * Pure helpers for fail-closed briefing publish orchestration.
 * Kept separate so node:test can cover the stuck-draft / merge races.
 */

/** Drop Netlify noise; keep GitHub Actions accuracy gate and similar. */
export function filterActionableChecks(checks) {
  const list = Array.isArray(checks) ? checks : [];
  return list.filter((c) => {
    const name = `${c.name || ""} ${c.context || ""}`;
    if (/netlify/i.test(name)) return false;
    return true;
  });
}

function upper(value) {
  return String(value || "").toUpperCase();
}

export function isPendingCheck(check) {
  const status = upper(check.status || check.state);
  return (
    status === "PENDING" ||
    status === "QUEUED" ||
    status === "IN_PROGRESS" ||
    status === "WAITING" ||
    status === "REQUESTED" ||
    (!check.conclusion && status !== "COMPLETED")
  );
}

export function isFailingCheck(check) {
  const conclusion = upper(check.conclusion);
  return (
    conclusion === "FAILURE" ||
    conclusion === "CANCELLED" ||
    conclusion === "TIMED_OUT" ||
    conclusion === "ACTION_REQUIRED" ||
    conclusion === "STARTUP_FAILURE" ||
    conclusion === "ERROR" ||
    conclusion === "FAIL"
  );
}

export function isSuccessfulCheck(check) {
  const conclusion = upper(check.conclusion);
  const status = upper(check.status);
  return (
    conclusion === "SUCCESS" ||
    conclusion === "NEUTRAL" ||
    conclusion === "SKIPPED" ||
    (status === "COMPLETED" &&
      (conclusion === "SUCCESS" ||
        conclusion === "NEUTRAL" ||
        conclusion === "SKIPPED"))
  );
}

/**
 * Evaluate PR check rollup + PR state.
 * @returns {{ state: 'waiting'|'success'|'failure'|'closed', pending: number, failing: number, actionable: number }}
 */
export function evaluatePrPublishState({ prState, checks }) {
  const state = upper(prState);
  // Another run (or manual merge) already landed — treat as success so we do not thrash.
  if (state === "MERGED") {
    return { state: "success", pending: 0, failing: 0, actionable: 0 };
  }
  if (state && state !== "OPEN") {
    return { state: "closed", pending: 0, failing: 0, actionable: 0 };
  }

  const actionable = filterActionableChecks(checks);
  if (!actionable.length) {
    return { state: "waiting", pending: 0, failing: 0, actionable: 0 };
  }

  const pending = actionable.filter(isPendingCheck);
  const failing = actionable.filter(isFailingCheck);
  if (failing.length) {
    return {
      state: "failure",
      pending: pending.length,
      failing: failing.length,
      actionable: actionable.length,
    };
  }
  if (!pending.length && actionable.every(isSuccessfulCheck)) {
    return {
      state: "success",
      pending: 0,
      failing: 0,
      actionable: actionable.length,
    };
  }
  return {
    state: "waiting",
    pending: pending.length,
    failing: 0,
    actionable: actionable.length,
  };
}
