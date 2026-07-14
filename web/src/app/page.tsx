import { EmptyState } from "@/components/EmptyState";
import { LiveHome } from "@/components/LiveHome";
import { getLatestBriefing } from "@/lib/briefings";

export default function HomePage() {
  const briefing = getLatestBriefing();

  if (!briefing) {
    return <EmptyState />;
  }

  return <LiveHome initialBriefing={briefing} />;
}
