/** Cash close in the session zone. A bar dated that day is a close only after this time. */
const CLOSE_AT: Record<string, { timeZone: string; close: string }> = {
  spx: { timeZone: "America/New_York", close: "16:00" },
  nasdaq: { timeZone: "America/New_York", close: "16:00" },
  vix: { timeZone: "America/New_York", close: "16:00" },
  nikkei: { timeZone: "Asia/Tokyo", close: "15:00" },
  kospi: { timeZone: "Asia/Seoul", close: "15:30" },
  hsi: { timeZone: "Asia/Hong_Kong", close: "16:00" },
  hstech: { timeZone: "Asia/Hong_Kong", close: "16:00" },
  shanghai: { timeZone: "Asia/Shanghai", close: "15:00" },
  us02y: { timeZone: "America/New_York", close: "16:00" },
  us05y: { timeZone: "America/New_York", close: "16:00" },
  us10y: { timeZone: "America/New_York", close: "16:00" },
  us30y: { timeZone: "America/New_York", close: "16:00" },
  usdjpy: { timeZone: "America/New_York", close: "17:00" },
  usdcny: { timeZone: "America/New_York", close: "17:00" },
  gold: { timeZone: "America/New_York", close: "13:30" },
  brent: { timeZone: "Europe/London", close: "19:30" },
};

const ALWAYS_OPEN = new Set(["btc", "btc-funding"]);

function zonedEpoch(date: string, hhmm: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const want = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  let ms = want;
  for (let i = 0; i < 3; i++) {
    const map: Record<string, string> = {};
    for (const p of fmt.formatToParts(new Date(ms))) map[p.type] = p.value;
    const got = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute);
    ms += want - got;
  }
  return ms;
}

/** A session still open at the snapshot is intraday. A finished session is a close. */
export function sessionKind(
  id: string,
  asOfDate: string,
  snapshotIso: string,
): "close" | "intraday" {
  const snap = Date.parse(snapshotIso);
  if (!asOfDate || !Number.isFinite(snap)) return "close";
  if (ALWAYS_OPEN.has(id)) return "intraday";
  const spec = CLOSE_AT[id] ?? { timeZone: "Asia/Shanghai", close: "23:59" };
  return snap >= zonedEpoch(asOfDate, spec.close, spec.timeZone) ? "close" : "intraday";
}

/** Quote clock for an intraday row. One zone: the snapshot is Asia/Shanghai. */
export function shanghaiQuote(snapshotIso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(snapshotIso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("timeZoneName")}`.trim();
}
