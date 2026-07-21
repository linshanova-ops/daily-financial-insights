import fs from "fs";
import path from "path";

const FUND_DIR = path.join(process.cwd(), "content", "fund");

export type FundUniverseItem = {
  rank: number;
  name: string;
  country: string;
  city: string;
  aum: number;
  strategy: string;
  change: string;
};

export type MonitoredFundRef = { rank: number; name: string };

export type FundSignal = {
  id: string;
  date: string;
  title: string;
  summary: string;
  summaryEn?: string;
  fund: string;
  source: string;
  tag: string;
  status: string;
  href?: string | null;
};

export type FundReviewItem = {
  id: string;
  title: string;
  reason: string;
  confidence: string;
  status: string;
  href?: string | null;
};

export type FundRule = {
  id: string;
  title: string;
  body: string;
};

export type FundLastScan = {
  at: string;
  fetched: number;
  newConfirmed: number;
  review: number;
};

export type FundMeta = {
  title: string;
  subtitle: string;
  updatedAt: string;
  updatedAtLabel: string;
  timezone: string;
  sourcesChecked: string;
  sourcesNote: string;
  scanWindow: string;
  phase: number;
  phaseNote: string;
  lastScan?: FundLastScan;
};

export type FundBundle = {
  meta: FundMeta;
  universe: FundUniverseItem[];
  monitored: FundUniverseItem[];
  signals: FundSignal[];
  review: FundReviewItem[];
  rules: FundRule[];
};

function readJson<T>(name: string): T {
  const raw = fs.readFileSync(path.join(FUND_DIR, name), "utf8");
  return JSON.parse(raw) as T;
}

export function loadFundBundle(): FundBundle {
  const meta = readJson<FundMeta>("meta.json");
  const universe = readJson<FundUniverseItem[]>("universe.json");
  const monitoredFile = readJson<{ funds: MonitoredFundRef[] }>("monitored.json");
  const signals = readJson<FundSignal[]>("signals.json");
  const review = readJson<FundReviewItem[]>("review.json");
  const rules = readJson<FundRule[]>("rules.json");

  const byRank = new Map(universe.map((f) => [f.rank, f]));
  const monitored = monitoredFile.funds
    .map((ref) => byRank.get(ref.rank))
    .filter((f): f is FundUniverseItem => Boolean(f));

  return { meta, universe, monitored, signals, review, rules };
}
