export type SignalGrade = "STRONG" | "MODERATE" | "WEAK";
export type WatchPriority = "HIGH" | "MEDIUM" | "LOW";

export interface Signal {
  grade: SignalGrade;
  name: string;
  evidence: string;
  mechanism: string;
  disprovedIf: string;
}

export interface WatchItem {
  priority: WatchPriority;
  headline: string;
  why: string;
  watch: string;
  trigger: string;
  invalidator: string;
  horizon: string;
  status: "new" | "continuing" | "escalated" | "retired";
}

export interface AssetView {
  asset: string;
  regime: string;
  driver: string;
  read: string;
  invalidator: string;
}

export interface KeySource {
  label: string;
  href: string;
}

export interface BriefingFrontmatter {
  date: string;
  title: string;
  coverageWindow: string;
  /** ISO timestamp when this briefing was published (UTC). */
  publishedAt?: string;
  marketTone: string;
  summary: string[];
  signal: string;
  watch: string;
  /** Clickable primary links for the day's key prints. */
  keySources?: KeySource[];
  globalRegime: string;
  globalChanged: string[];
  globalImplies: string[];
  globalTensions: string;
  chinaStance: string;
  chinaChanged: string[];
  chinaImplies: string[];
  chinaDivergences: string;
  /** Stable per-asset regime lens (alpha/beta framework); optional for older briefings. */
  assetFramework?: AssetView[];
  signals: Signal[];
  watchItems: WatchItem[];
  sources: string;
  singleSource: string;
}

export interface Briefing extends BriefingFrontmatter {
  slug: string;
}
