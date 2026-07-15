import type { AssetView } from "@/lib/types";
import { accents } from "@/lib/module-accents";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

interface AssetFrameworkProps {
  assets: AssetView[];
}

/**
 * Stable per-asset lens: regime (dominant beta), today's driver reading,
 * how the asset traded vs the regime, and what would invalidate the regime.
 */
export function AssetFramework({ assets }: AssetFrameworkProps) {
  if (!assets?.length) return null;
  const a = accents.violet;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`h-6 w-1 rounded-full ${a.headerBar}`} aria-hidden />
        <p
          className={`text-xs font-semibold uppercase tracking-[0.24em] ${a.eyebrow}`}
        >
          Asset framework
        </p>
        <KindLabel kind="judgment" />
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        One stable lens per asset
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
        Most of a day&rsquo;s move is beta to an identifiable macro regime.
        Each card names the dominant regime, today&rsquo;s driver reading, how
        the asset actually traded, and the observation that would invalidate
        the regime call.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {assets.map((view) => (
          <article
            key={view.asset}
            className="border-l-2 border-violet/40 bg-violet/5 p-5"
          >
            <h3 className="display text-xl tracking-tight text-ink">
              {view.asset}
            </h3>
            <dl className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
              <div>
                <dt className="font-semibold uppercase tracking-[0.14em] text-violet">
                  Regime
                </dt>
                <dd className="mt-1">{view.regime}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-[0.14em] text-violet">
                  Driver today
                </dt>
                <dd className="mt-1">
                  {view.driver}
                  <SourceButton sources={view.driverSources} />
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-[0.14em] text-violet">
                  Read
                </dt>
                <dd className="mt-1">{view.read}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-[0.14em] text-ink/60">
                  Regime invalidated if
                </dt>
                <dd className="mt-1">{view.invalidator}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
