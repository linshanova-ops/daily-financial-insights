"use client";

import { useCallback, useEffect, useState } from "react";
import type { Briefing } from "@/lib/types";
import { diffBriefings } from "@/lib/briefing-diff";
import {
  fetchBriefingByDate,
  fetchBriefingIndex,
} from "@/lib/content-feed";
import {
  reloadPublishedBriefing,
  requestBriefingRefresh,
  type RefreshPhase,
} from "@/lib/request-refresh";
import { BriefingView } from "./BriefingView";
import { LiveStatus } from "./LiveStatus";

/** Keep showing newly published content without another click. */
const FEED_POLL_MS = 15_000;

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
  const [phase, setPhase] = useState<RefreshPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pullFeed = useCallback(async (signal?: AbortSignal) => {
    try {
      const [next, index] = await Promise.all([
        reloadPublishedBriefing(),
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
      if (busy) return;
      void pullFeed();
    }, FEED_POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [pullFeed, busy]);

  const onRefreshNow = useCallback(async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      const result = await requestBriefingRefresh((nextPhase, message) => {
        setPhase(nextPhase);
        if (message) setStatusMessage(message);
      });

      setPhase(result.phase);
      if (result.message) setStatusMessage(result.message);
      if (result.briefing) {
        setBriefing(result.briefing);
        setPublishedAt(result.briefing.publishedAt ?? new Date().toISOString());
        setUpdatedAt(new Date().toISOString());
        setLive(true);
        void pullFeed();
      }
    } finally {
      setBusy(false);
    }
  }, [pullFeed]);

  const buttonLabel =
    phase === "requesting"
      ? "Requesting…"
      : phase === "generating"
        ? "Generating…"
        : busy
          ? "Working…"
          : "Refresh now";

  const changes = diffBriefings(briefing, previous);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LiveStatus
            updatedAt={updatedAt}
            live={live}
            phase={phase}
          />
          <button
            type="button"
            onClick={() => void onRefreshNow()}
            disabled={busy}
            className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-forest underline decoration-copper/50 underline-offset-4 disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </div>
        {statusMessage ? (
          <p className="pb-2 text-sm text-ink-soft" role="status">
            {statusMessage}
          </p>
        ) : (
          <p className="pb-2 text-xs text-ink/45">
            Refresh now requests a new briefing from live sources (max 5 per
            day), then updates this page when it is published.
          </p>
        )}
      </div>
      <BriefingView
        briefing={briefing}
        previousDate={previousDate}
        changesSincePrevious={changes}
        publishedAtFallback={publishedAt}
      />
    </>
  );
}
