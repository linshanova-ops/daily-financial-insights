import type { WatchItem, WatchPriority } from "@/lib/types";

const priorityStyles: Record<WatchPriority, string> = {
  HIGH: "text-strong",
  MEDIUM: "text-moderate",
  LOW: "text-weak",
};

interface WatchListProps {
  items: WatchItem[];
}

export function WatchList({ items }: WatchListProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-copper" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
          What to watch
        </p>
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        Triggers and invalidators
      </h2>
      <ol className="mt-10 space-y-8">
        {items.map((item, index) => (
          <li key={item.headline} className="border-b border-line pb-8 last:border-b-0">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-sm font-semibold text-ink/40">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-[0.16em] ${priorityStyles[item.priority]}`}
              >
                {item.priority}
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-ink/40">
                {item.status}
              </span>
            </div>
            <h3 className="display mt-2 text-2xl tracking-tight text-ink">
              {item.headline}
            </h3>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-soft">
              {item.why}
            </p>
            <dl className="mt-5 grid gap-3 text-sm leading-relaxed text-ink-soft md:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink">Watch</dt>
                <dd className="mt-1">{item.watch}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Horizon</dt>
                <dd className="mt-1">{item.horizon}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Trigger</dt>
                <dd className="mt-1">{item.trigger}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Invalidator</dt>
                <dd className="mt-1">{item.invalidator}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
