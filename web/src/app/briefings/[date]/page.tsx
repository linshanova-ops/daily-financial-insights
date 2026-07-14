import { notFound } from "next/navigation";
import { BriefingView } from "@/components/BriefingView";
import {
  formatBriefingDate,
  getAllBriefingDates,
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

  return <BriefingView briefing={briefing} showHeroCta={false} />;
}
