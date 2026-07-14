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

export interface BriefingFrontmatter {
  date: string;
  title: string;
  coverageWindow: string;
  marketTone: string;
  summary: string[];
  signal: string;
  watch: string;
  globalRegime: string;
  globalChanged: string[];
  globalImplies: string[];
  globalTensions: string;
  chinaStance: string;
  chinaChanged: string[];
  chinaImplies: string[];
  chinaDivergences: string;
  signals: Signal[];
  watchItems: WatchItem[];
  sources: string;
  singleSource: string;
}

export interface Briefing extends BriefingFrontmatter {
  slug: string;
}
