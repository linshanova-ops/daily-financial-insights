/** If 09:00 already running → skip; leftover occupying cap → archive; else create. */
const REPO = "daily-financial-insights";

export function createdMs(row) {
  return Number(row?.createdAt ?? row?.createdAtMs ?? row?.lastModified ?? 0) || 0;
}

export function agentId(row) {
  return String(row?.agentId || row?.id || row?.bcId || "");
}

function isOurs(row, repoNeedle) {
  const blob = [row?.repoUrl, ...(Array.isArray(row?.repos) ? row.repos : [])]
    .join(" ")
    .toLowerCase();
  return blob.includes(repoNeedle);
}

export function catchupAction(items, slotStartMs, repoNeedle = REPO) {
  const running = (items || []).filter(
    (r) =>
      !r?.archived &&
      String(r?.status || "").toLowerCase() === "running" &&
      isOurs(r, repoNeedle),
  );
  if (running.some((r) => createdMs(r) >= slotStartMs)) return { action: "skip" };
  const leftover = running.find((r) => createdMs(r) < slotStartMs);
  if (leftover) return { action: "archive", agent: leftover };
  return { action: "create" };
}
