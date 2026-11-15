import { L } from "@/components/L";
import { LiveArchive } from "@/components/LiveArchive";
import { getAllBriefings } from "@/lib/briefings";

export const metadata = {
  title: "Archive",
};

export default function BriefingsArchivePage() {
  const briefings = getAllBriefings().map((item) => ({
    date: item.date,
    title: item.title,
    spine: item.spine,
    marketTone: item.marketTone,
    coverageWindow: item.coverageWindow,
  }));

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        <L en="Archive" zh="归档" />
      </p>
      <h1 className="display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
        <L en="Past briefings" zh="往期简报" />
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        <L
          en="Each book is one day's briefing, newest on the right. Pick a spine to open it."
          zh="每本书是一天的简报，最新的在右边。点击书脊即可打开。"
        />
      </p>
      <LiveArchive initialItems={briefings} />
    </section>
  );
}
