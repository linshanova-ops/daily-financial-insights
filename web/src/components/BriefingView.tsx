import type { Briefing } from "@/lib/types";
import { BriefingHero } from "./BriefingHero";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { SituationBlock } from "./SituationBlock";
import { AssetFramework } from "./AssetFramework";
import { SignalList } from "./SignalList";
import { WatchList } from "./WatchList";
import { SourcesCaveats } from "./SourcesCaveats";
import { KeySources } from "./KeySources";
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
  const marketOverview = briefing.marketOverview;
  const marketDashboard = briefing.marketDashboard;
  const hasMarketOverview = Boolean(marketOverview?.items?.length);
  const hasMarketDashboard = Boolean(marketDashboard?.groups?.length);

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
      />
      <div id="skim" className="scroll-mt-28">
        <ExecutiveSummary
          summary={briefing.summary}
          signal={briefing.signal}
          watch={briefing.watch}
        />
      </div>
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
      <KeySources sources={briefing.keySources} />
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
          assets: briefing.assetFramework?.length ? (
            <AssetFramework assets={briefing.assetFramework} />
          ) : null,
          signals: <SignalList signals={briefing.signals} />,
          watch: <WatchList items={briefing.watchItems} />,
          sources: (
            <SourcesCaveats
              sources={briefing.sources}
              singleSource={briefing.singleSource}
            />
          ),
        }}
      />
    </>
  );
}
