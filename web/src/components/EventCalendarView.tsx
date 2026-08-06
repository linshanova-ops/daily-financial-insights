import type { CalendarEvent, EventCalendar } from "@/lib/types";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

interface EventCalendarViewProps {
  calendar: EventCalendar;
  themeTitles?: Record<string, string>;
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.timeBeijing ?? "99:99").localeCompare(b.timeBeijing ?? "99:99");
  });
}

function formatDay(iso: string): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return iso.slice(5);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Compact dated releases from briefing day through next Friday. */
export function EventCalendarView({
  calendar,
  themeTitles = {},
}: EventCalendarViewProps) {
  const events = sortEvents(calendar.events ?? []);

  return (
    <section
      id="calendar"
      className="section-band scroll-mt-24 border-y border-line/60 bg-paper/55"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-5 w-1 rounded-full bg-copper" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
              Event calendar
            </p>
            <KindLabel kind="fact" />
          </div>
          <p className="text-xs tabular-nums text-ink/45">
            {calendar.windowStart} → {calendar.windowEnd} (Beijing)
          </p>
        </div>
        {calendar.note ? (
          <p className="mt-1 max-w-2xl text-xs text-ink/40">{calendar.note}</p>
        ) : null}

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            No dated fixtures verified in window.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {events.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[4.5rem_2.75rem_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-0.5 py-1.5 text-sm sm:grid-cols-[5.5rem_3rem_4rem_minmax(0,1fr)_auto]"
              >
                <span className="tabular-nums text-xs text-ink/45">
                  {formatDay(row.date)}
                </span>
                <span className="tabular-nums text-xs text-ink/45">
                  {row.timeBeijing ?? "—"}
                </span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40 sm:inline">
                  {row.region}
                </span>
                <span className="min-w-0 font-medium text-ink">
                  <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40 sm:hidden">
                    {row.region}{" "}
                  </span>
                  {row.event}
                  {(row.consensus || row.prior) && (
                    <span className="ml-1.5 font-normal text-ink/45">
                      {row.consensus ? `est ${row.consensus}` : ""}
                      {row.consensus && row.prior ? " / " : ""}
                      {row.prior ? `prior ${row.prior}` : ""}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {row.themeId ? (
                    <a
                      href={`#theme-${row.themeId}`}
                      className="focus-ring text-[10px] font-semibold uppercase tracking-[0.12em] text-forest underline-offset-2 hover:underline"
                    >
                      {themeTitles[row.themeId] ?? "Theme"}
                    </a>
                  ) : null}
                  <SourceButton
                    sources={
                      row.sources?.length
                        ? row.sources
                        : row.source
                          ? [row.source]
                          : undefined
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
