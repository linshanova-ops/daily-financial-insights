import Link from "next/link";
import { formatBriefingDate } from "@/lib/briefings-format";
import { L } from "./L";

/** Quiet archive link — not a second summary of the day. */
export function PreviousBriefingLink({
  previousDate,
}: {
  previousDate?: string | null;
}) {
  if (!previousDate) return null;

  return (
    <p className="mx-auto w-full max-w-6xl px-5 pb-2 text-sm text-ink/45 sm:px-8">
      <L en="Previous briefing: " zh="上一期：" />
      <Link
        href={`/briefings/${previousDate}`}
        className="focus-ring font-medium text-ink-soft underline decoration-line underline-offset-4 transition hover:text-forest"
      >
        <L
          en={formatBriefingDate(previousDate)}
          zh={formatBriefingDate(previousDate, "zh")}
        />
      </Link>
    </p>
  );
}
