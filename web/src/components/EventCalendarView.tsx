import type { CalendarEvent, EventCalendar } from "@/lib/types";
import { KindLabel } from "./KindLabel";
import { SourceButton } from "./SourceButton";

interface EventCalendarViewProps {
  calendar: EventCalendar;
  themeTitles?: Record<string, string>;
}

function groupByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatDayHeading(iso: string): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Dated releases from briefing day through next Friday. */
export function EventCalendarView({
  calendar,
  themeTitles = {},
}: EventCalendarViewProps) {
  const groups = groupByDate(calendar.events ?? []);

  return (
    <section
      id="calendar"
      className="section-band scroll-mt-24 border-y border-line/60 bg-paper/55"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-copper" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
            Event calendar
          </p>
          <KindLabel kind="fact" />
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          Prints through next Friday
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Event window: {calendar.windowStart} → {calendar.windowEnd} (Beijing).
          {calendar.note ? ` ${calendar.note}` : ""}
        </p>

        {groups.length === 0 ? (
          <p className="mt-10 text-base text-ink-soft">
            No dated fixtures verified in window.
          </p>
        ) : (
          <ol className="mt-10 space-y-10">
            {groups.map(([date, events]) => (
              <li key={date}>
                <h3 className="display text-xl tracking-tight text-ink">
                  {formatDayHeading(date)}
                </h3>
                <ul className="mt-4 space-y-5 border-t border-line pt-4">
                  {events.map((row) => (
                    <li key={row.id} className="text-sm leading-relaxed">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {row.timeBeijing ? (
                          <span className="font-semibold tabular-nums text-ink/50">
                            {row.timeBeijing}
                          </span>
                        ) : null}
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                          {row.region} · {row.category}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-medium text-ink">
                        {row.event}
                      </p>
                      {(row.consensus || row.prior) && (
                        <p className="mt-1 text-ink-soft">
                          {row.consensus ? `Est. ${row.consensus}` : null}
                          {row.consensus && row.prior ? " · " : null}
                          {row.prior ? `Prior ${row.prior}` : null}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SourceButton
                          sources={
                            row.sources?.length
                              ? row.sources
                              : row.source
                                ? [row.source]
                                : undefined
                          }
                        />
                        {row.themeId ? (
                          <a
                            href={`#theme-${row.themeId}`}
                            className="focus-ring text-xs font-semibold uppercase tracking-[0.12em] text-forest underline-offset-4 hover:underline"
                          >
                            Theme ·{" "}
                            {themeTitles[row.themeId] ?? row.themeId}
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
