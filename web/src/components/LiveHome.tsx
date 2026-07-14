"use client";

import { useEffect, useState } from "react";
import type { Briefing } from "@/lib/types";
import { fetchLatestBriefing } from "@/lib/content-feed";
import { BriefingView } from "./BriefingView";
import { LiveStatus } from "./LiveStatus";

const POLL_MS = 60_000;

interface LiveHomeProps {
  initialBriefing: Briefing;
}

export function LiveHome({ initialBriefing }: LiveHomeProps) {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const next = await fetchLatestBriefing(controller.signal);
        if (cancelled) return;
        setBriefing(next);
        setUpdatedAt(new Date().toISOString());
        setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    }

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  return (
    <>
      <LiveStatus updatedAt={updatedAt} live={live} />
      <BriefingView briefing={briefing} />
    </>
  );
}
