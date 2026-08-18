import type { Briefing, ThemeCard } from "@/lib/types";
import { BriefingHero } from "./BriefingHero";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { SituationBlock } from "./SituationBlock";
import { AssetFramework } from "./AssetFramework";
import { AssetClasses } from "./AssetClasses";
import { WatchList } from "./WatchList";
import { EventCalendarView } from "./EventCalendarView";
import { ThemeCards } from "./ThemeCards";
import { SourcesCaveats } from "./SourcesCaveats";
import { KeyFigures } from "./KeyFigures";
import { MarketDashboard } from "./MarketDashboard";
import { MarketOverview } from "./MarketOverview";
import { PreviousBriefingLink } from "./PreviousBriefingLink";
import { SectionNav } from "./SectionNav";
import { DetailTabs } from "./DetailTabs";

interface BriefingViewProps {
  briefing: Briefing;
  showHeroCta?: boolean;
  heroVariant?: "full" | "compact" | "skim";
  previousDate?: string | null;
  publishedAtFallback?: string | null;
}

export function BriefingView({
  briefing,
  showHeroCta = true,
  heroVariant = "full",
  previousDate = null,
  publishedAtFallback = null,
}: BriefingViewProps) {
  const figures = briefing.figures ?? [];
  const themeCards: ThemeCard[] = briefing.themeCards ?? [];
  const themeTitles = Object.fromEntries(
    themeCards.map((t) => [t.id, t.title]),
  );
  const marketOverview = briefing.marketOverview;
  const marketDashboard = briefing.marketDashboard;
  const hasMarketOverview = Boolean(marketOverview?.items?.length);
  const hasMarketDashboard = Boolean(marketDashboard?.groups?.length);
  const hasThemes = themeCards.length > 0;
  const eventCalendar = briefing.eventCalendar;
  const assetClasses = briefing.assetClasses;
  const hasCalendar = Boolean(eventCalendar?.events?.length);
  const hasWatchFallback = Boolean(briefing.watchItems?.length);

  return (
    <>
      <BriefingHero
        date={briefing.date}
        marketTone={briefing.marketTone}
        publishedAt={briefing.publishedAt ?? publishedAtFallback}
        showCta={showHeroCta}
        variant={heroVariant}
        marketsHref={
          hasMarketOverview ? "#market-overview" : "#market-dashboard"
        }
      />
      <SectionNav
        hasFigures={figures.length > 0}
        hasMarketOverview={hasMarketOverview}
        hasMarketDashboard={hasMarketDashboard}
        hasThemes={hasThemes}
        hasCalendar={hasCalendar || hasWatchFallback}
      />
      <div id="skim" className="scroll-mt-28">
        <ExecutiveSummary
          summary={briefing.summary}
          signal={briefing.signal}
          watch={briefing.watch}
          themes={themeCards}
        />
      </div>
      {hasThemes ? <ThemeCards themes={themeCards} /> : null}
      <PreviousBriefingLink previousDate={previousDate} />
      <div className="mx-auto mb-2 w-full max-w-6xl px-5 pt-4 text-xs uppercase tracking-[0.18em] text-ink/45 sm:px-8">
        Coverage window: {briefing.coverageWindow}
      </div>
      {hasMarketOverview && marketOverview ? (
        <MarketOverview data={marketOverview} />
      ) : null}
      {hasMarketDashboard && marketDashboard ? (
        <MarketDashboard data={marketDashboard} />
      ) : null}
      {figures.length ? <KeyFigures figures={figures} /> : null}
      {hasCalendar && eventCalendar?.events ? (
        <EventCalendarView
          calendar={eventCalendar}
          themeTitles={themeTitles}
        />
      ) : hasWatchFallback ? (
        <WatchList items={briefing.watchItems} />
      ) : null}
      <DetailTabs
        panels={{
          global: (
            <SituationBlock
              id="global-situation"
              eyebrow="Global situation"
              title="World regime and today's delta"
              stanceLabel="Regime"
              stance={briefing.globalRegime}
              changed={briefing.globalChanged}
              implies={briefing.globalImplies}
              tensionsLabel="Tensions"
              tensions={briefing.globalTensions}
              accent="azure"
              band
            />
          ),
          china: (
            <SituationBlock
              id="china-situation"
              eyebrow="China situation"
              title="Policy stance and domestic pulse"
              stanceLabel="Policy stance"
              stance={briefing.chinaStance}
              changed={briefing.chinaChanged}
              implies={briefing.chinaImplies}
              tensionsLabel="Divergences to watch"
              tensions={briefing.chinaDivergences}
              accent="crimson"
            />
          ),
          assets: assetClasses?.length ? (
            <AssetClasses classes={assetClasses} themeTitles={themeTitles} />
          ) : briefing.assetFramework?.length ? (
            <AssetFramework assets={briefing.assetFramework} />
          ) : null,
          sources: (
            <SourcesCaveats
              sources={briefing.sources}
              singleSource={briefing.singleSource}
              keySources={briefing.keySources}
            />
          ),
        }}
      />
    </>
  );
}
