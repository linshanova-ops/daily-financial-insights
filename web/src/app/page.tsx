import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { LiveHome } from "@/components/LiveHome";
import { getLatestBriefing } from "@/lib/briefings";
import { briefingPageMeta } from "@/lib/briefings-format";

export function generateMetadata(): Metadata {
  const briefing = getLatestBriefing();
  return briefing ? briefingPageMeta(briefing) : {};
}

export default function HomePage() {
  const briefing = getLatestBriefing();

  if (!briefing) {
    return <EmptyState />;
  }

  return <LiveHome initialBriefing={briefing} />;
}
