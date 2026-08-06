"use client";

import { useCallback, useEffect, useState } from "react";
import type { Briefing } from "@/lib/types";
import {
  fetchBriefingIndex,
  fetchLatestBriefing,
} from "@/lib/content-feed";
import { formatPublishedAt, freshnessStatusLine } from "@/lib/format-published";
import { BriefingView } from "./BriefingView";
import { LiveStatus } from "./LiveStatus";

/** Pick up newly published briefings without a full page reload. */
const FEED_POLL_MS = 60_000;

interface LiveHomeProps {
  initialBriefing: Briefing;
}

export function LiveHome({ initialBriefing }: LiveHomeProps) {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [previousDate, setPreviousDate] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(
    initialBriefing.publishedAt ?? null,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const pullFeed = useCallback(async (signal?: AbortSignal) => {
    try {
      const [next, index] = await Promise.all([
        fetchLatestBriefing(signal),
        fetchBriefingIndex(signal),
      ]);
      if (signal?.aborted) return;

      setBriefing(next);
      setPublishedAt(next.publishedAt ?? index.generatedAt ?? null);
      setUpdatedAt(new Date().toISOString());
      setLive(true);

      const priorDate =
        index.briefings.find((item) => item.date !== next.date)?.date ?? null;
      setPreviousDate(priorDate);
    } catch {
      if (!signal?.aborted) setLive(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void pullFeed(controller.signal);
    const id = window.setInterval(() => {
      void pullFeed();
    }, FEED_POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [pullFeed]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 sm:px-8">
        <LiveStatus updatedAt={updatedAt} live={live} />
        <p className="pb-2 text-sm text-ink-soft" role="status">
          Showing the latest published edition
          {publishedAt
            ? ` · ${freshnessStatusLine(publishedAt)}`
            : "."}{" "}
          Scheduled slots are 08:00 / 20:00 China time when auto-generate is on.
          {publishedAt ? (
            <span className="mt-1 block text-xs text-ink/45">
              Published {formatPublishedAt(publishedAt)}
            </span>
          ) : null}
        </p>
      </div>
      <BriefingView
        briefing={briefing}
        heroVariant="skim"
        previousDate={previousDate}
        publishedAtFallback={publishedAt}
      />
    </>
  );
}
