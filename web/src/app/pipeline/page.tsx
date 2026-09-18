export const metadata = {
  title: "Pipeline",
};

export default function PipelinePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        How a briefing is made
      </p>
      <h1 className="display mt-3 max-w-3xl text-4xl tracking-tight text-ink sm:text-6xl">
        Inbox, primaries, then a short read
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Weekdays at 09:00 China time the site publishes from that morning’s 彭博
        财经早茶 plus dated primary prints (Treasury, Fed, AP closes, PBOC/NBS,
        华尔街见闻 / 财新 / 第一财经). What you see is the sourced tape and a
        few themes — not a six-book asset matrix and not a live feed.
      </p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Accuracy:</span> every hard
        number needs a dated source in the coverage window. A shorter accurate
        briefing beats a wrong figure. Before deploy, an automated scan checks
        that cited pages support the claimed numbers.
      </p>
    </section>
  );
}
