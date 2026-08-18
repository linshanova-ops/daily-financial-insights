/**
 * Cap-safe weekday catch-up: Cursor allows one RUNNING cloud agent.
 * 09:00 dashboard cron dies if a leftover chat still occupies the slot.
 *
 * @typedef {{ agentId?: string, id?: string, status?: string, createdAt?: number, lastModified?: number, archived?: boolean, repos?: string[], name?: string, runtime?: string }} AgentRow
 * @typedef {{ action: 'create' | 'wait' | 'archive-and-create' | 'blocked', agent?: AgentRow }} CatchupDecision
 */

/** Wait this long after Beijing 09:00 before archiving a leftover that still holds the cap. */
export const CATCHUP_STUCK_MS = 90 * 60 * 1000;

export function occupiesCap(status) {
  const s = String(status || "").toLowerCase();
  return s === "running" || s === "idle" || s === "waiting_for_background_work";
}

export function createdMs(row) {
  const n = Number(row?.createdAt ?? row?.lastModified ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function matchesRepo(row, repoNeedle) {
  if (!repoNeedle) return true;
  const needle = String(repoNeedle).toLowerCase();
  const repos = Array.isArray(row?.repos) ? row.repos.join(" ") : "";
  return `${repos} ${row?.name || ""}`.toLowerCase().includes(needle);
}

export function agentId(row) {
  return String(row?.agentId || row?.id || "");
}

/**
 * @param {AgentRow[]} items
 * @param {{ repoNeedle: string, slotStartMs: number, nowMs: number, stuckMs?: number }} opts
 * @returns {CatchupDecision}
 */
export function pickCatchupAction(
  items,
  { repoNeedle, slotStartMs, nowMs, stuckMs = CATCHUP_STUCK_MS },
) {
  const occupying = (items || []).filter(
    (row) => !row?.archived && occupiesCap(row?.status),
  );
  occupying.sort((a, b) => createdMs(b) - createdMs(a));

  if (!occupying.length) return { action: "create" };

  const ours = occupying.filter((row) => matchesRepo(row, repoNeedle));
  const todays = ours.filter((row) => createdMs(row) >= slotStartMs);
  if (todays[0]) return { action: "wait", agent: todays[0] };

  const leftover = ours.filter((row) => createdMs(row) < slotStartMs);
  const stuck = nowMs >= slotStartMs + stuckMs;
  if (leftover[0]) {
    if (!stuck) return { action: "wait", agent: leftover[0] };
    return { action: "archive-and-create", agent: leftover[0] };
  }
  if (!stuck) return { action: "wait", agent: occupying[0] };
  return { action: "blocked", agent: occupying[0] };
}
