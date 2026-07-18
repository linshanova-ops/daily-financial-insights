import type { Briefing } from "@/lib/types";
import type { BriefingChange } from "@/lib/briefing-diff";
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
import { SinceLastBriefing } from "./SinceLastBriefing";
import { SectionNav } from "./SectionNav";

interface BriefingViewProps {
  briefing: Briefing;
  showHeroCta?: boolean;
  heroVariant?: "full" | "compact";
  previousDate?: string | null;
  changesSincePrevious?: BriefingChange[] | null;
  publishedAtFallback?: string | null;
}

export function BriefingView({
  briefing,
  showHeroCta = true,
  heroVariant = "full",
  previousDate = null,
  changesSincePrevious = null,
  publishedAtFallback = null,
}: BriefingViewProps) {
  const figures = briefing.figures ?? [];
  const marketDashboard = briefing.marketDashboard;

  return (
    <>
      <BriefingHero
        date={briefing.date}
        marketTone={briefing.marketTone}
        publishedAt={briefing.publishedAt ?? publishedAtFallback}
        showCta={showHeroCta}
        variant={heroVariant}
      />
      <SectionNav
        hasFigures={figures.length > 0}
        hasMarketDashboard={Boolean(marketDashboard?.groups?.length)}
      />
      <div className="mx-auto mb-2 w-full max-w-6xl px-5 pt-4 text-xs uppercase tracking-[0.18em] text-ink/45 sm:px-8">
        Coverage window: {briefing.coverageWindow}
      </div>
      {marketDashboard?.groups?.length ? (
        <MarketDashboard data={marketDashboard} />
      ) : null}
      {figures.length ? <KeyFigures figures={figures} /> : null}
      <KeySources sources={briefing.keySources} />
      {changesSincePrevious ? (
        <SinceLastBriefing
          previousDate={previousDate}
          changes={changesSincePrevious}
        />
      ) : null}
      <ExecutiveSummary
        summary={briefing.summary}
        signal={briefing.signal}
        watch={briefing.watch}
      />
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
      {briefing.assetFramework?.length ? (
        <AssetFramework assets={briefing.assetFramework} />
      ) : null}
      <SignalList signals={briefing.signals} />
      <WatchList items={briefing.watchItems} />
      <SourcesCaveats
        sources={briefing.sources}
        singleSource={briefing.singleSource}
      />
    </>
  );
}
