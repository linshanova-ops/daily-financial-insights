"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  fetchBriefingIndex,
  type BriefingIndexItem,
} from "@/lib/content-feed";
import { formatBriefingDate } from "@/lib/briefings-format";
import { enOf, zhOf } from "@/lib/lang-text";
import { spineTitle } from "@/lib/spine-title";
import { L } from "./L";

/** All ≥4.5:1 against paper text. */
const SPINE_COLORS = [
  "var(--forest)",
  "var(--azure)",
  "#2f5d3f",
  "var(--violet)",
  "var(--amber)",
  "var(--ink-soft)",
  "var(--crimson)",
];
const SPINE_HEIGHTS = [13, 14.25, 12.25, 13.75];

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
          <ul className="shelf mt-3">
            {[...month.rows].reverse().map((briefing) => {
              const day = Number(briefing.date.slice(8));
              const tone = briefing.marketTone;
              const en = enOf(briefing.spine) || spineTitle(enOf(tone));
              const zh =
                zhOf(briefing.spine) ||
                (typeof tone === "string" ? en : spineTitle(zhOf(tone), "zh"));
              const style = {
                "--spine": SPINE_COLORS[day % SPINE_COLORS.length],
                height: `${SPINE_HEIGHTS[day % SPINE_HEIGHTS.length]}rem`,
                width: day % 3 === 0 ? "3.25rem" : "2.75rem",
              } as CSSProperties;
              return (
                <li key={briefing.date} className="shelf-slot">
                  <Link href={`/briefings/${briefing.date}`} className="spine" style={style}>
                    <span className="sr-only">
                      <L
                        en={formatBriefingDate(briefing.date)}
                        zh={formatBriefingDate(briefing.date, "zh")}
                      />
                    </span>
                    <span className="spine-day display" aria-hidden="true">
                      {day}
                    </span>
                    <span className="spine-title">
                      <L en={en} zh={zh} />
                    </span>
                  </Link>
                </li>
              );
            })}
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
