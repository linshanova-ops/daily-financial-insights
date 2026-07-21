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
  kind: "stat" | "bars" | "insight";
  /** Large primary value for kind=stat (e.g. "$84.95", "4.55%"). */
  display?: string;
  /** Optional secondary line for kind=stat (e.g. "+$0.22", "Jul 15"). */
  delta?: string;
  unit?: string;
  points?: FigurePoint[];
  note?: string;
  /**
   * Required for kind=insight (Bloomberg 今日图表): one clear analysis point
   * explaining what the chart implies for today's tape / policy / risk.
   */
  analysis?: string;
  /**
   * Site path to the chart image saved from the email
   * (e.g. "/inbox-charts/bloomberg-2026-07-21.jpg").
   */
  imageSrc?: string;
  source: FactSource;
}

/** One tape row in the Market Dashboard closes table. */
export interface MarketDashboardRow {
  id: string;
  asset: string;
  latest: string;
  change?: string | null;
  changeDirection?: "up" | "down" | "flat";
  asOfDate: string;
  source: FactSource;
}

export interface MarketDashboardGroup {
  id: string;
  title: string;
  rows: MarketDashboardRow[];
}

/** Snapshot of market closes captured at briefing generate time. */
export interface MarketDashboard {
  asOf: string;
  note?: string;
  groups: MarketDashboardGroup[];
}

/** One desk-color line from Bloomberg 市场一览 (qualitative tape, not closes). */
export interface MarketOverviewItem {
  /** Short sleeve label, e.g. 美国股市 / 外汇市场. */
  label: string;
  /** Chinese desk color from the email — keep as sourced. */
  text: string;
}

/**
 * Morning desk tape from 彭博 市场一览 — qualitative color above Market closes.
 * Values must come from the inbox newsletter (never invent levels).
 */
export interface MarketOverview {
  /** Briefing / email calendar day (YYYY-MM-DD). */
  asOfDate: string;
  note?: string;
  items: MarketOverviewItem[];
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
  /**
   * Qualitative 市场一览 desk color from 彭博 daily email.
   * Shown above Market closes — not a substitute for marketDashboard prints.
   */
  marketOverview?: MarketOverview;
  /**
   * Market closes tape (indices / yields / FX / commodities / crypto).
   * Populated at generate time by fetch-market-closes.mjs — not live on the page.
   */
  marketDashboard?: MarketDashboard;
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
