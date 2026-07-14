import type { Briefing } from "@/lib/types";
import { BriefingHero } from "./BriefingHero";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { SituationBlock } from "./SituationBlock";
import { SignalList } from "./SignalList";
import { WatchList } from "./WatchList";
import { SourcesCaveats } from "./SourcesCaveats";

interface BriefingViewProps {
  briefing: Briefing;
  showHeroCta?: boolean;
}

export function BriefingView({
  briefing,
  showHeroCta = true,
}: BriefingViewProps) {
  return (
    <>
      <BriefingHero
        date={briefing.date}
        marketTone={briefing.marketTone}
        showCta={showHeroCta}
      />
      <div className="mx-auto mb-4 w-full max-w-6xl px-5 text-xs uppercase tracking-[0.18em] text-ink/45 sm:px-8">
        Coverage window: {briefing.coverageWindow}
      </div>
      <ExecutiveSummary
        summary={briefing.summary}
        signal={briefing.signal}
        watch={briefing.watch}
      />
      <SituationBlock
        eyebrow="Global situation"
        title="World regime and today's delta"
        stanceLabel="Regime"
        stance={briefing.globalRegime}
        changed={briefing.globalChanged}
        implies={briefing.globalImplies}
        tensionsLabel="Tensions"
        tensions={briefing.globalTensions}
      />
      <SituationBlock
        eyebrow="China situation"
        title="Policy stance and domestic pulse"
        stanceLabel="Policy stance"
        stance={briefing.chinaStance}
        changed={briefing.chinaChanged}
        implies={briefing.chinaImplies}
        tensionsLabel="Divergences to watch"
        tensions={briefing.chinaDivergences}
      />
      <SignalList signals={briefing.signals} />
      <WatchList items={briefing.watchItems} />
      <SourcesCaveats
        sources={briefing.sources}
        singleSource={briefing.singleSource}
      />
    </>
  );
}
