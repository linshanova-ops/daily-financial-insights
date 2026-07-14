"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchBriefingIndex,
  type BriefingIndexItem,
} from "@/lib/content-feed";
import { formatBriefingDate } from "@/lib/briefings-format";

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
    return <p className="mt-12 text-ink-soft">No briefings published yet.</p>;
  }

  return (
    <ul className="mt-12 divide-y divide-line border-y border-line">
      {items.map((briefing) => (
        <li key={briefing.date}>
          <Link
            href={`/briefings/${briefing.date}`}
            className="group flex flex-col gap-2 py-6 transition hover:bg-paper/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-2"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
                {formatBriefingDate(briefing.date)}
              </p>
              <h2 className="display mt-2 text-2xl tracking-tight text-ink group-hover:text-forest">
                {briefing.title}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-ink-soft sm:text-right">
              {briefing.marketTone}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
