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

/**
 * Canonical narrative unit: one event → one full expansion.
 * Other modules reuse as different insights — not verbatim copies.
 */
export interface ThemeCard {
  id: string;
  title: string;
  grade: SignalGrade;
  /** Asset filter tags (e.g. Oil, BTC) — one card, many assets. */
  assets?: string[];
  fact: string;
  factSources?: FactSource[];
  mechanism: string;
  trigger: string;
  invalidator: string;
  horizon: string;
  status: "new" | "continuing" | "escalated" | "retired";
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
  /** Forward desk label when present (calendar vs desk boards). */
  desk?:
    | "us-global-equities"
    | "china-hk-equities"
    | "rates-credit"
    | "fx"
    | "commodities"
    | "crypto";
  kind?: "calendar" | "desk";
  sources?: FactSource[];
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

export type EventRegion = "US" | "China" | "Japan" | "UK" | "EU" | "Other";
export type EventCategory =
  | "data"
  | "central-bank"
  | "earnings"
  | "ipo"
  | "fiscal-flow";

/** Dated release / speech in the Event Calendar (replaces narrative Watch). */
export interface CalendarEvent {
  id: string;
  date: string;
  timeBeijing?: string;
  region: EventRegion;
  category: EventCategory;
  event: string;
  consensus?: string;
  prior?: string;
  themeId?: string;
  source: FactSource;
  sources?: FactSource[];
}

export interface EventCalendar {
  windowStart: string;
  windowEnd: string;
  note?: string;
  events: CalendarEvent[];
}

export type AssetClassId =
  | "us-equities"
  | "china-hk-equities"
  | "rates"
  | "fx"
  | "commodities"
  | "crypto";

export interface AssetInstrument {
  name: string;
  driver: string;
  driverSources?: FactSource[];
  read: string;
  invalidator?: string;
  themeId?: string;
}

/** Asset Framework grouped by class (currencies nest under FX). */
export interface AssetClassBlock {
  id: AssetClassId;
  title: string;
  regime: string;
  instruments: AssetInstrument[];
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
  /** Optional extra cites for accuracy gate (UI still uses `source`). */
  sources?: FactSource[];
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
  /**
   * Theme cards — only full narrative of each core story (fact → mechanism →
   * trigger → invalidation). Optional for older briefings.
   */
  themeCards?: ThemeCard[];
  /**
   * Event Calendar — dated prints from briefing day through next Friday
   * (Friday after the Friday-on-or-after publish day).
   * Preferred over narrative watchItems for new briefings.
   */
  eventCalendar?: EventCalendar;
  /**
   * Assets by class (US equities · China/HK · Rates · FX · Commodities · Crypto).
   * Preferred over flat assetFramework for new briefings.
   */
  assetClasses?: AssetClassBlock[];
  signals: Signal[];
  watchItems: WatchItem[];
  sources: string;
  singleSource: string;
}

export interface Briefing extends BriefingFrontmatter {
  slug: string;
}
