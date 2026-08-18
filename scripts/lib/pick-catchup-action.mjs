/** If 09:00 already running → skip; leftover occupying cap → archive; else create. */
const REPO = "daily-financial-insights";

function createdMs(row) {
  return Number(row?.createdAt ?? row?.lastModified ?? 0) || 0;
}

function ours(items, repoNeedle) {
  return (items || []).filter(
    (r) =>
      !r?.archived &&
      String(r?.status || "").toLowerCase() === "running" &&
      (Array.isArray(r.repos) ? r.repos.join(" ") : "").toLowerCase().includes(repoNeedle),
  );
}

export function catchupAction(items, slotStartMs, repoNeedle = REPO) {
  const running = ours(items, repoNeedle);
  if (running.some((r) => createdMs(r) >= slotStartMs)) return { action: "skip" };
  const leftover = running.find((r) => createdMs(r) < slotStartMs);
  if (leftover) return { action: "archive", agent: leftover };
  return { action: "create" };
}
