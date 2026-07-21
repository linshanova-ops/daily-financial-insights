"use client";

import { useCallback, useEffect, useState } from "react";
import type { Briefing } from "@/lib/types";
import { diffBriefings } from "@/lib/briefing-diff";
import {
  fetchBriefingByDate,
  fetchBriefingIndex,
  fetchLatestBriefing,
} from "@/lib/content-feed";
import { BriefingView } from "./BriefingView";
import { LiveStatus } from "./LiveStatus";

/** Pick up newly published briefings without a full page reload. */
const FEED_POLL_MS = 60_000;

interface LiveHomeProps {
  initialBriefing: Briefing;
}

export function LiveHome({ initialBriefing }: LiveHomeProps) {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [previous, setPrevious] = useState<Briefing | null>(null);
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
      if (priorDate) {
        const prior = await fetchBriefingByDate(priorDate, signal);
        if (!signal?.aborted) setPrevious(prior);
      } else {
        setPrevious(null);
      }
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

  const changes = diffBriefings(briefing, previous);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 sm:px-8">
        <LiveStatus updatedAt={updatedAt} live={live} />
        <p className="pb-2 text-sm text-ink-soft" role="status">
          Briefings publish automatically twice daily (08:00 and 20:00 China
          time). This page shows the latest published edition.
          {publishedAt ? (
            <span className="mt-1 block text-xs text-ink/45">
              Latest published {new Date(publishedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
      </div>
      <BriefingView
        briefing={briefing}
        heroVariant="skim"
        previousDate={previousDate}
        changesSincePrevious={changes}
        publishedAtFallback={publishedAt}
      />
    </>
  );
}
