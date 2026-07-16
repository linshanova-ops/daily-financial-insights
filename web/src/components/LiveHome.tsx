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

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
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
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null);

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

  useEffect(() => {
    if (retryAfterSec == null || retryAfterSec <= 0) return;
    const id = window.setInterval(() => {
      setRetryAfterSec((prev) => {
        if (prev == null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryAfterSec]);

  const onRefreshNow = useCallback(async () => {
    setBusy(true);
    setStatusMessage(null);
    setRetryAfterSec(null);
    try {
      const result = await requestBriefingRefresh((nextPhase, message) => {
        setPhase(nextPhase);
        if (message) setStatusMessage(message);
      });

      setPhase(result.phase);
      if (result.message) setStatusMessage(result.message);
      if (result.retryAfterSec != null && result.retryAfterSec > 0) {
        setRetryAfterSec(result.retryAfterSec);
      }
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

  const rateLimited = phase === "rate_limited" || (retryAfterSec != null && retryAfterSec > 0);
  const buttonLabel =
    phase === "requesting"
      ? "Requesting…"
      : phase === "generating"
        ? "Generating…"
        : rateLimited
          ? retryAfterSec
            ? `Retry in ${formatCountdown(retryAfterSec)}`
            : "Rate limited"
          : busy
            ? "Working…"
            : "Refresh now";

  const helperCopy =
    statusMessage ??
    (process.env.NEXT_PUBLIC_REFRESH_API
      ? "Refresh requests a new briefing from live sources (max 5 per UTC day), then updates this page when published."
      : "Shows the latest published briefing. On-demand generation needs NEXT_PUBLIC_REFRESH_API.");

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
            disabled={busy || rateLimited}
            aria-busy={busy}
            className="focus-ring mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-forest underline decoration-copper/50 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </div>
        <p className="pb-2 text-sm text-ink-soft" role="status">
          {helperCopy}
          {publishedAt ? (
            <span className="mt-1 block text-xs text-ink/45">
              Latest published {new Date(publishedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
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
