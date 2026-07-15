import { notFound } from "next/navigation";
import { BriefingView } from "@/components/BriefingView";
import { diffBriefings } from "@/lib/briefing-diff";
import {
  formatBriefingDate,
  getAllBriefingDates,
  getAllBriefings,
  getBriefingByDate,
} from "@/lib/briefings";

interface BriefingPageProps {
  params: Promise<{ date: string }>;
}

export function generateStaticParams() {
  return getAllBriefingDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: BriefingPageProps) {
  const { date } = await params;
  const briefing = getBriefingByDate(date);
  if (!briefing) {
    return { title: "Briefing not found" };
  }
  return {
    title: formatBriefingDate(briefing.date),
    description: briefing.marketTone,
  };
}

export default async function BriefingPage({ params }: BriefingPageProps) {
  const { date } = await params;
  const briefing = getBriefingByDate(date);

  if (!briefing) {
    notFound();
  }

  const all = getAllBriefings();
  const index = all.findIndex((item) => item.date === date);
  const previous = index >= 0 ? all[index + 1] ?? null : null;
  const changes = diffBriefings(briefing, previous);

  return (
    <BriefingView
      briefing={briefing}
      showHeroCta={false}
      previousDate={previous?.date ?? null}
      changesSincePrevious={changes}
    />
  );
}
