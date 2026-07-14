import Link from "next/link";
import { formatBriefingDate, getAllBriefings } from "@/lib/briefings";

export const metadata = {
  title: "Archive",
};

export default function BriefingsArchivePage() {
  const briefings = getAllBriefings();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        Archive
      </p>
      <h1 className="display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
        Past briefings
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Each entry is a dated output from the daily financial research pipeline.
      </p>

      {briefings.length === 0 ? (
        <p className="mt-12 text-ink-soft">No briefings published yet.</p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {briefings.map((briefing) => (
            <li key={briefing.date}>
              <Link
                href={`/briefings/${briefing.date}`}
                className="group flex flex-col gap-2 py-6 transition hover:bg-paper/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-2"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
                    {formatBriefingDate(briefing.date)}
                  </p>
                  <h2 className="display mt-2 text-2xl tracking-tight text-ink group-hover:text-forest">
                    {briefing.title}
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-ink-soft sm:text-right">
                  {briefing.marketTone}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
