"use client";

import { useCallback, useEffect, useState } from "react";
import type { Briefing } from "@/lib/types";
import { fetchLatestBriefing } from "@/lib/content-feed";
import { BriefingView } from "./BriefingView";
import { LiveStatus } from "./LiveStatus";

const POLL_MS = 15_000;

interface LiveHomeProps {
  initialBriefing: Briefing;
}

export function LiveHome({ initialBriefing }: LiveHomeProps) {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const next = await fetchLatestBriefing(signal);
      setBriefing(next);
      setUpdatedAt(new Date().toISOString());
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [refresh]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
        <LiveStatus updatedAt={updatedAt} live={live} />
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-forest underline decoration-copper/50 underline-offset-4 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
      <BriefingView briefing={briefing} />
    </>
  );
}
