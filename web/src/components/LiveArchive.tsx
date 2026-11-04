"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchBriefingIndex,
  type BriefingIndexItem,
} from "@/lib/content-feed";
import { formatBriefingDate } from "@/lib/briefings-format";
import { L } from "./L";
import { Prose } from "./Prose";

interface LiveArchiveProps {
  initialItems: BriefingIndexItem[];
}

export function LiveArchive({ initialItems }: LiveArchiveProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const index = await fetchBriefingIndex(controller.signal);
        if (!cancelled) setItems(index.briefings);
      } catch {
        // keep initial items
      }
    }

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 60_000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  if (items.length === 0) {
    return (
      <p className="mt-12 text-ink-soft">
        <L en="No briefings published yet." zh="尚无已发布简报。" />
      </p>
    );
  }

  const months: { key: string; rows: BriefingIndexItem[] }[] = [];
  for (const item of items) {
    const key = item.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.rows.push(item);
    else months.push({ key, rows: [item] });
  }

  return (
    <div className="mt-12 space-y-10">
      {months.map((month) => (
        <section key={month.key}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
            <L en={monthLabel(month.key)} zh={monthLabel(month.key, "zh")} />
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {month.rows.map((briefing) => (
              <li key={briefing.date}>
                <Link
                  href={`/briefings/${briefing.date}`}
                  className="group flex flex-col gap-2 py-6 transition hover:bg-paper/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-2"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
                      <L
                        en={formatBriefingDate(briefing.date)}
                        zh={formatBriefingDate(briefing.date, "zh")}
                      />
                    </p>
                    <h3 className="display mt-2 text-2xl tracking-tight text-ink group-hover:text-forest">
                      <Prose text={briefing.title} />
                    </h3>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-ink-soft sm:text-right">
                    <Prose text={briefing.marketTone} />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function monthLabel(month: string, lang: "en" | "zh" = "en"): string {
  const parsed = new Date(`${month}-01T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
