import { BriefingView } from "@/components/BriefingView";
import { EmptyState } from "@/components/EmptyState";
import { getLatestBriefing } from "@/lib/briefings";

export default function HomePage() {
  const briefing = getLatestBriefing();

  if (!briefing) {
    return <EmptyState />;
  }

  return <BriefingView briefing={briefing} />;
}
