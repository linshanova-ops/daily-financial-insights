import Link from "next/link";
import { formatBriefingDate } from "@/lib/briefings-format";

interface BriefingHeroProps {
  date: string;
  marketTone: string;
  showCta?: boolean;
}

export function BriefingHero({
  date,
  marketTone,
  showCta = true,
}: BriefingHeroProps) {
  return (
    <section className="relative min-h-[88vh] overflow-hidden px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-forest/15 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-copper/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-mist to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-end gap-8">
        <p className="reveal text-xs font-semibold uppercase tracking-[0.28em] text-forest">
          {formatBriefingDate(date)}
        </p>
        <h1 className="display reveal reveal-delay-1 max-w-5xl text-5xl leading-[0.95] tracking-tight text-ink sm:text-7xl lg:text-8xl">
          linshanova
          <span className="mt-3 block text-2xl font-normal tracking-normal text-forest sm:text-3xl lg:text-4xl">
            Daily Financial Insights
          </span>
        </h1>
        <p className="reveal reveal-delay-2 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
          {marketTone}
        </p>
        {showCta ? (
          <div className="reveal reveal-delay-3 flex flex-wrap items-center gap-4">
            <a
              href="#executive-summary"
              className="inline-flex items-center bg-forest px-5 py-3 text-sm font-semibold text-paper transition hover:bg-forest-bright"
            >
              Read briefing
            </a>
            <Link
              href="/pipeline"
              className="text-sm font-semibold text-ink-soft underline decoration-copper/60 underline-offset-4 transition hover:text-forest"
            >
              How the pipeline works
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
