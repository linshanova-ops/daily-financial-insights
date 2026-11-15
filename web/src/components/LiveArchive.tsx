"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import {
  fetchBriefingIndex,
  type BriefingIndexItem,
} from "@/lib/content-feed";
import { formatBriefingDate } from "@/lib/briefings-format";
import { enOf, zhOf } from "@/lib/lang-text";
import { spineTitle, spineTopic } from "../../scripts/lib/spine-title.mjs";
import syrMark from "../../public/brand/syr-mark.png";
import { L } from "./L";

const SHELF_SIZE = 20;
const SPINE_HEIGHTS = [20.5, 21.5, 20, 21];
/** Darkens every picture enough for white spine text. */
const SPINE_SHADE =
  "linear-gradient(to bottom, rgba(12, 9, 10, 0.62), rgba(12, 9, 10, 0.3) 45%, rgba(12, 9, 10, 0.68))";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

  const shelf = items.slice(0, SHELF_SIZE);
  const older = items.slice(SHELF_SIZE);

  return (
    <div className="mt-12">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">
        <L en={`Latest ${shelf.length}`} zh={`最近 ${shelf.length} 期`} />
      </h2>
      <ul className="shelf">
        {shelf.map((briefing) => {
          const day = Number(briefing.date.slice(8));
          const { en, zh } = spineOf(briefing);
          const style = {
            height: `${SPINE_HEIGHTS[day % SPINE_HEIGHTS.length]}rem`,
            backgroundImage: `${SPINE_SHADE}, url(${BASE}/shelf/${spineTopic(en)}.webp)`,
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
                <span className="spine-date" aria-hidden="true">
                  <span className="display spine-day">{day}</span>
                  <L
                    en={monthLabel(briefing.date, "en", "short")}
                    zh={monthLabel(briefing.date, "zh", "short")}
                  />
                </span>
                <span className="spine-title">
                  <L en={en} zh={zh} />
                </span>
                <span className="spine-brand" aria-hidden="true">
                  <Image src={syrMark} alt="" width={22} height={22} />
                  <span>syravocado</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {older.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-semibold text-forest">
            <L en={`Older briefings (${older.length})`} zh={`更早的简报（${older.length}）`} />
          </summary>
          <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {older.map((briefing) => {
              const { en, zh } = spineOf(briefing);
              return (
                <li key={briefing.date}>
                  <Link href={`/briefings/${briefing.date}`} className="text-ink-soft hover:text-forest">
                    <span className="tabular-nums text-ink/50">{briefing.date}</span>{" "}
                    <L en={en} zh={zh} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

function spineOf(briefing: BriefingIndexItem): { en: string; zh: string } {
  const tone = briefing.marketTone;
  const en = enOf(briefing.spine) || spineTitle(enOf(tone));
  const zh =
    zhOf(briefing.spine) ||
    (typeof tone === "string" ? en : spineTitle(zhOf(tone), "zh"));
  return { en, zh };
}

function monthLabel(
  date: string,
  lang: "en" | "zh",
  month: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month,
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 7)}-01T12:00:00Z`));
}
