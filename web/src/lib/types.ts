export type SignalGrade = "STRONG" | "MODERATE" | "WEAK";
export type WatchPriority = "HIGH" | "MEDIUM" | "LOW";

export interface FactSource {
  label: string;
  href: string;
}

export interface KeySource {
  label: string;
  href: string;
}

export interface Signal {
  grade: SignalGrade;
  name: string;
  evidence: string;
  /** Optional click-throughs for the evidence row. */
  evidenceSources?: FactSource[];
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
  /** Optional click-throughs for the driver reading. */
  driverSources?: FactSource[];
  read: string;
  invalidator: string;
}

/** A fact line with optional click-through to the original source post. */
export interface SourcedFact {
  text: string;
  sources?: FactSource[];
}

export type FactLine = string | SourcedFact;

/** Author-defined visual figure — values must match sourced briefing facts. */
export interface FigurePoint {
  label: string;
  value: number;
}

export interface BriefingFigure {
  id: string;
  title: string;
  kind: "stat" | "bars";
  /** Large primary value for kind=stat (e.g. "$84.95", "4.55%"). */
  display?: string;
  /** Optional secondary line for kind=stat (e.g. "+$0.22", "Jul 15"). */
  delta?: string;
  unit?: string;
  points?: FigurePoint[];
  note?: string;
  source: FactSource;
}

export interface BriefingFrontmatter {
  date: string;
  title: string;
  coverageWindow: string;
  /** ISO timestamp when this briefing was published (UTC). */
  publishedAt?: string;
  marketTone: string;
  summary: FactLine[];
  signal: string;
  watch: string;
  /** Clickable primary links for the day's key prints. */
  keySources?: KeySource[];
  /** Optional accurate key figures for visual strip (never invent values). */
  figures?: BriefingFigure[];
  globalRegime: string;
  globalChanged: FactLine[];
  globalImplies: FactLine[];
  globalTensions: string;
  chinaStance: string;
  chinaChanged: FactLine[];
  chinaImplies: FactLine[];
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
