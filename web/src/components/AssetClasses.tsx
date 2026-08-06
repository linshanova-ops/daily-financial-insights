import type { AssetClassBlock } from "@/lib/types";
import { accents } from "@/lib/module-accents";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

interface AssetClassesProps {
  classes: AssetClassBlock[];
  themeTitles?: Record<string, string>;
}

const CLASS_ORDER = [
  "us-equities",
  "china-hk-equities",
  "rates",
  "fx",
  "commodities",
  "crypto",
] as const;

/** Assets grouped by class — currencies nest under FX. */
export function AssetClasses({
  classes,
  themeTitles = {},
}: AssetClassesProps) {
  if (!classes?.length) return null;
  const a = accents.violet;
  const ordered = CLASS_ORDER.map((id) =>
    classes.find((c) => c.id === id),
  ).filter((c): c is AssetClassBlock => Boolean(c));
  const rest = classes.filter(
    (c) => !(CLASS_ORDER as readonly string[]).includes(c.id),
  );
  const blocks = [...ordered, ...rest];

  return (
    <section
      id="asset-framework"
      className="section-band scroll-mt-24 border-y border-line/60 bg-paper/55"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
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
          By asset class
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-soft">
          Class-level regime first; instruments underneath. FX holds USD / JPY /
          CNY as rows — not peer cards beside equities or oil.
        </p>

        <div className="mt-10 space-y-10">
          {blocks.map((block) => (
            <div key={block.id} className="border-t border-line pt-8">
              <h3 className="display text-2xl tracking-tight text-ink">
                {block.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
                <span className="font-semibold uppercase tracking-[0.14em] text-violet">
                  Regime ·{" "}
                </span>
                {block.regime}
              </p>
              <ul className="mt-5 grid gap-5 md:grid-cols-2">
                {block.instruments.map((inst) => (
                  <li
                    key={inst.name}
                    className="border-l-2 border-violet/40 bg-violet/5 p-4"
                  >
                    <p className="font-semibold text-ink">{inst.name}</p>
                    <dl className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.12em] text-violet">
                          Driver
                        </dt>
                        <dd className="mt-1">
                          {inst.driver}
                          <SourceButton sources={inst.driverSources} />
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.12em] text-violet">
                          Read
                        </dt>
                        <dd className="mt-1">{inst.read}</dd>
                      </div>
                      {inst.invalidator ? (
                        <div>
                          <dt className="font-semibold uppercase tracking-[0.12em] text-ink/50">
                            Invalidated if
                          </dt>
                          <dd className="mt-1">{inst.invalidator}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {inst.themeId ? (
                      <a
                        href={`#theme-${inst.themeId}`}
                        className="focus-ring mt-3 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-forest underline-offset-4 hover:underline"
                      >
                        Theme · {themeTitles[inst.themeId] ?? inst.themeId}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
