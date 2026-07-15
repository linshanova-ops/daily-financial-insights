import Link from "next/link";
import type { BriefingChange } from "@/lib/briefing-diff";
import { formatBriefingDate } from "@/lib/briefings-format";

interface SinceLastBriefingProps {
  previousDate?: string | null;
  changes: BriefingChange[];
}

const kindLabel: Record<BriefingChange["kind"], string> = {
  tone: "Tone",
  signal: "Signal",
  watch: "Watch",
  summary: "Summary",
  print: "Print",
};

export function SinceLastBriefing({
  previousDate,
  changes,
}: SinceLastBriefingProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-copper" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
          Since last briefing
        </p>
      </div>
      <h2 className="display mt-3 text-2xl tracking-tight text-ink sm:text-3xl">
        What changed after the last publish
      </h2>
      {previousDate ? (
        <p className="mt-2 text-sm text-ink-soft">
          Compared with{" "}
          <Link
            href={`/briefings/${previousDate}`}
            className="font-semibold text-forest underline decoration-copper/40 underline-offset-4"
          >
            {formatBriefingDate(previousDate)}
          </Link>
          .
        </p>
      ) : null}
      <ul className="mt-6 space-y-3">
        {changes.map((change, index) => (
          <li
            key={`${change.kind}-${index}`}
            className="flex flex-col gap-1 border-l-2 border-copper/35 pl-4 sm:flex-row sm:gap-3"
          >
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-copper">
              {kindLabel[change.kind]}
            </span>
            <span className="text-sm leading-relaxed text-ink-soft sm:text-base">
              {change.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
