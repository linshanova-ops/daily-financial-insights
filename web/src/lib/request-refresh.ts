import { fetchBriefingIndex, fetchLatestBriefing } from "./content-feed";
import type { Briefing } from "./types";

export type RefreshPhase =
  | "idle"
  | "requesting"
  | "generating"
  | "rate_limited"
  | "ready"
  | "error";

export interface RefreshResult {
  phase: RefreshPhase;
  briefing?: Briefing;
  message?: string;
  retryAfterSec?: number;
}

function getRefreshApiUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_REFRESH_API?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.endsWith("netlify.app") || host === "localhost") {
      return "/.netlify/functions/refresh-briefing";
    }
  }
  return null;
}

async function fingerprintLatest(): Promise<string> {
  const [index, latest] = await Promise.all([
    fetchBriefingIndex(),
    fetchLatestBriefing(),
  ]);
  return `${index.generatedAt}|${latest.date}|${latest.marketTone}|${latest.signal}`;
}

export async function requestBriefingRefresh(
  onPhase?: (phase: RefreshPhase, message?: string) => void,
  options?: { pollMs?: number; timeoutMs?: number },
): Promise<RefreshResult> {
  const pollMs = options?.pollMs ?? 10_000;
  const timeoutMs = options?.timeoutMs ?? 20 * 60_000;
  const api = getRefreshApiUrl();

  const before = await fingerprintLatest().catch(() => "");

  if (!api) {
    const briefing = await fetchLatestBriefing();
    return {
      phase: "ready",
      briefing,
      message:
        "Loaded the latest published briefing. On-demand generation is not configured yet (set NEXT_PUBLIC_REFRESH_API).",
    };
  }

  onPhase?.("requesting", "Requesting a fresh briefing…");

  let trigger: {
    ok?: boolean;
    status?: string;
    message?: string;
    retryAfterSec?: number;
    error?: string;
  };

  try {
    const response = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "refresh-now" }),
    });
    trigger = (await response.json()) as typeof trigger;

    if (response.status === 429) {
      onPhase?.(
        "rate_limited",
        trigger.message ?? "Please wait before requesting another update.",
      );
      const briefing = await fetchLatestBriefing();
      return {
        phase: "rate_limited",
        briefing,
        message: trigger.message,
        retryAfterSec: trigger.retryAfterSec,
      };
    }

    if (response.status === 503) {
      const briefing = await fetchLatestBriefing();
      return {
        phase: "ready",
        briefing,
        message: trigger.error ?? "Refresh API not configured.",
      };
    }

    if (!response.ok && response.status !== 202) {
      return {
        phase: "error",
        message: trigger.error ?? trigger.message ?? `Refresh failed (${response.status})`,
      };
    }
  } catch (err) {
    return {
      phase: "error",
      message: err instanceof Error ? err.message : "Could not reach refresh API",
    };
  }

  onPhase?.(
    "generating",
    trigger.message ?? "Generating briefing… this usually takes several minutes.",
  );

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, pollMs));
    try {
      const now = await fingerprintLatest();
      if (before && now !== before) {
        const briefing = await fetchLatestBriefing();
        onPhase?.("ready", "Briefing updated.");
        return { phase: "ready", briefing, message: "Briefing updated." };
      }
    } catch {
      // keep polling through transient feed errors
    }
  }

  const briefing = await fetchLatestBriefing().catch(() => undefined);
  return {
    phase: "error",
    briefing,
    message:
      "Timed out waiting for a new briefing. The update may still finish — try Refresh again in a few minutes.",
  };
}

export async function reloadPublishedBriefing(): Promise<Briefing> {
  return fetchLatestBriefing();
}
