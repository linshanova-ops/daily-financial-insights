import type { Briefing } from "./types";

export interface BriefingIndexItem {
  date: string;
  title: string;
  marketTone: string;
  coverageWindow: string;
}

export interface BriefingIndex {
  generatedAt: string;
  latest: string | null;
  briefings: BriefingIndexItem[];
}

const REPO = "linshanova-ops/daily-financial-insights";
const BRANCH = "main";

/** Live feed from GitHub so content updates as soon as main changes. */
export function getLiveFeedBase(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTENT_FEED) {
    return process.env.NEXT_PUBLIC_CONTENT_FEED.replace(/\/$/, "");
  }
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/web/public/data`;
}

export async function fetchBriefingIndex(
  signal?: AbortSignal,
): Promise<BriefingIndex> {
  const base = getLiveFeedBase();
  const response = await fetch(`${base}/index.json?t=${Date.now()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load briefing index (${response.status})`);
  }
  return response.json() as Promise<BriefingIndex>;
}

export async function fetchLatestBriefing(
  signal?: AbortSignal,
): Promise<Briefing> {
  const base = getLiveFeedBase();
  const response = await fetch(`${base}/latest.json?t=${Date.now()}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load latest briefing (${response.status})`);
  }
  return response.json() as Promise<Briefing>;
}

export async function fetchBriefingByDate(
  date: string,
  signal?: AbortSignal,
): Promise<Briefing> {
  const base = getLiveFeedBase();
  const response = await fetch(
    `${base}/briefings/${date}.json?t=${Date.now()}`,
    { cache: "no-store", signal },
  );
  if (!response.ok) {
    throw new Error(`Failed to load briefing ${date} (${response.status})`);
  }
  return response.json() as Promise<Briefing>;
}
