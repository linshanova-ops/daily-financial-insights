/** If 09:00 already running → skip; leftover occupying cap → send; else create. */
const REPO = "daily-financial-insights";

export function listRows(listed) {
  if (Array.isArray(listed)) return listed;
  return listed?.items || listed?.agents || [];
}

export function agentId(row) {
  return String(row?.agentId || row?.bcId || row?.id || "");
}

export function createdMs(row) {
  return Number(row?.createdAtMs ?? row?.createdAt ?? row?.lastModified ?? 0) || 0;
}

function repoHaystack(row) {
  const repos = Array.isArray(row?.repos) ? row.repos : [];
  const bits = repos.map((r) => (typeof r === "string" ? r : r?.url || r?.repoUrl || ""));
  return [...bits, row?.repoUrl, row?.url].filter(Boolean).join(" ").toLowerCase();
}

export function ours(items, repoNeedle = REPO) {
  const needle = String(repoNeedle).toLowerCase();
  return (items || []).filter((r) => {
    if (r?.archived || r?.isArchived) return false;
    if (String(r?.status || "").toLowerCase() !== "running") return false;
    return repoHaystack(r).includes(needle);
  });
}

export function catchupAction(items, slotStartMs, repoNeedle = REPO) {
  const running = ours(items, repoNeedle);
  if (running.some((r) => createdMs(r) >= slotStartMs)) return { action: "skip" };
  const leftover = running.find((r) => createdMs(r) < slotStartMs);
  if (leftover) return { action: "send", agent: leftover };
  return { action: "create" };
}
