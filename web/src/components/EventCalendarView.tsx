import type { CalendarEvent, EventCalendar } from "@/lib/types";
import { regionZh } from "@/lib/lang";
import { KindLabel } from "./KindLabel";
import { L } from "./L";
import { Prose } from "./Prose";
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

function formatDay(iso: string, lang: "en" | "zh"): string {
  const dt = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return iso.slice(5);
  return dt.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
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
              <L en="Event calendar" zh="事件日历" />
            </p>
            <KindLabel kind="fact" />
          </div>
          <p className="text-xs tabular-nums text-ink/45">
            {calendar.windowStart} → {calendar.windowEnd}{" "}
            <L en="(Beijing)" zh="（北京）" />
          </p>
        </div>
        {calendar.note ? (
          <p className="mt-1 max-w-2xl text-xs text-ink/40">
            <Prose text={calendar.note} />
          </p>
        ) : null}

        {events.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            <L
              en="No dated fixtures verified in window."
              zh="窗口内没有已核对的日期事件。"
            />
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {events.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2 text-sm sm:grid sm:grid-cols-[5.5rem_3rem_4rem_minmax(0,1fr)_auto] sm:py-1.5"
              >
                <span className="tabular-nums text-xs text-ink/45">
                  <L en={formatDay(row.date, "en")} zh={formatDay(row.date, "zh")} />
                </span>
                <span className={`${row.timeBeijing ? "" : "hidden sm:inline"} tabular-nums text-xs text-ink/45`}>
                  {row.timeBeijing || "—"}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">
                  <L en={row.region} zh={regionZh(row.region)} />
                </span>
                <span className="min-w-0 basis-full font-medium text-ink sm:basis-auto">
                  <Prose text={row.event} />
                  {(row.consensus || row.prior) && (
                    <span className="ml-1.5 font-normal text-ink/45">
                      {row.consensus ? (
                        <L
                          en={`est ${row.consensus}`}
                          zh={`预期 ${row.consensus}`}
                        />
                      ) : null}
                      {row.consensus && row.prior ? " / " : ""}
                      {row.prior ? (
                        <L en={`prior ${row.prior}`} zh={`前值 ${row.prior}`} />
                      ) : null}
                    </span>
                  )}
                </span>
                <span className="flex basis-full flex-wrap items-center justify-start gap-2 sm:basis-auto sm:shrink-0 sm:justify-end">
                  {row.themeId ? (
                    <a
                      href={`#theme-${row.themeId}`}
                      className="focus-ring text-[10px] font-semibold uppercase tracking-[0.12em] text-forest underline-offset-2 hover:underline"
                    >
                      {themeTitles[row.themeId] ? (
                        <Prose text={themeTitles[row.themeId]} />
                      ) : (
                        <L en="Theme" zh="主题" />
                      )}
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
