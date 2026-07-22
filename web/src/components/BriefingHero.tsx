import { formatBriefingDate } from "@/lib/briefings-format";
import { formatPublishedAt } from "@/lib/format-published";
import { WelcomeWave } from "./WelcomeWave";

interface BriefingHeroProps {
  date: string;
  marketTone: string;
  publishedAt?: string | null;
  showCta?: boolean;
  /** Full brand hero on landing, skim on Today, compact on archive detail pages. */
  variant?: "full" | "compact" | "skim";
  /** Skim primary CTA target (Markets). Pipeline stays in SiteNav. */
  marketsHref?: string;
}

export function BriefingHero({
  date,
  marketTone,
  publishedAt,
  showCta = true,
  variant = "full",
  marketsHref = "#market-dashboard",
}: BriefingHeroProps) {
  const publishedLabel = formatPublishedAt(publishedAt);
  const compact = variant === "compact";
  const skim = variant === "skim";

  return (
    <section
      className={`relative overflow-hidden px-5 sm:px-8 ${
        compact
          ? "pb-10 pt-8 sm:pt-10"
          : skim
            ? "pb-12 pt-8 sm:pt-10"
            : "min-h-[88vh] pb-16 pt-10 sm:pt-16"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-forest/15 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-copper/15 blur-3xl" />
        {!compact ? (
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-mist to-transparent" />
        ) : null}
      </div>

      <div
        className={`mx-auto flex w-full max-w-6xl gap-6 ${
          skim
            ? "flex-col items-stretch md:flex-row md:items-center md:justify-between md:gap-10"
            : compact
              ? "flex-col"
              : "min-h-[70vh] flex-col justify-between gap-10"
        }`}
      >
        {!compact && !skim ? <WelcomeWave /> : null}
        <div
          className={`flex min-w-0 flex-col gap-6 ${
            skim ? "flex-1 md:max-w-xl lg:max-w-2xl" : compact ? "" : "pb-2"
          }`}
        >
          <p className="reveal text-xs font-semibold uppercase tracking-[0.28em] text-forest">
            {formatBriefingDate(date)}
          </p>
          {compact ? (
            <h1 className="display reveal reveal-delay-1 max-w-4xl text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
              {formatBriefingDate(date)}
              <span className="mt-2 block text-xl font-normal tracking-normal text-forest sm:text-2xl">
                Daily briefing
              </span>
            </h1>
          ) : (
            <h1
              className={`display reveal reveal-delay-1 tracking-tight text-ink ${
                skim
                  ? "max-w-4xl text-4xl leading-[0.95] sm:text-5xl"
                  : "max-w-5xl text-5xl leading-[0.95] sm:text-7xl lg:text-8xl"
              }`}
            >
              syravocado
              <span
                className={`block font-normal tracking-normal text-forest ${
                  skim
                    ? "mt-2 text-xl sm:text-2xl"
                    : "mt-3 text-2xl sm:text-3xl lg:text-4xl"
                }`}
              >
                Daily Financial Insights
              </span>
            </h1>
          )}
          {publishedLabel ? (
            <p className="reveal reveal-delay-1 text-sm font-medium tracking-wide text-ink/55">
              Published {publishedLabel}
            </p>
          ) : null}
          <p
            className={`reveal reveal-delay-2 max-w-2xl leading-relaxed text-ink-soft ${
              compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
            }`}
          >
            {marketTone}
          </p>
          {showCta ? (
            <div className="reveal reveal-delay-3 flex flex-wrap items-center gap-4">
              {skim ? (
                <a
                  href={marketsHref}
                  className="focus-ring inline-flex items-center bg-forest px-5 py-3 text-sm font-semibold text-paper transition hover:bg-forest-bright"
                >
                  Markets
                </a>
              ) : (
                <a
                  href="#executive-summary"
                  className="focus-ring inline-flex items-center bg-forest px-5 py-3 text-sm font-semibold text-paper transition hover:bg-forest-bright"
                >
                  Read briefing
                </a>
              )}
            </div>
          ) : null}
        </div>
        {skim ? (
          <div className="reveal reveal-delay-2 flex shrink-0 justify-center md:justify-end">
            <WelcomeWave />
          </div>
        ) : null}
      </div>
    </section>
  );
}
