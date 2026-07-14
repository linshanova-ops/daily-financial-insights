import { LiveArchive } from "@/components/LiveArchive";
import { getAllBriefings } from "@/lib/briefings";

export const metadata = {
  title: "Archive",
};

export default function BriefingsArchivePage() {
  const briefings = getAllBriefings().map((item) => ({
    date: item.date,
    title: item.title,
    marketTone: item.marketTone,
    coverageWindow: item.coverageWindow,
  }));

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
        This list refreshes automatically when new briefings land on main.
      </p>
      <LiveArchive initialItems={briefings} />
    </section>
  );
}
