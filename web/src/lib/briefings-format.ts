import type { Metadata } from "next";
import type { Briefing } from "./types";
import { enOf } from "./lang-text";

/** First few sentences of the day's tone, for the title and the share description. */
export function briefingFacts(tone: string, count = 3): string {
  const text = tone.replace(/\s+/g, " ").trim();
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (parts.length ? parts : [text]).slice(0, count).join(" ");
}

export function formatBriefingDate(
  date: string,
  lang: "en" | "zh" = "en",
): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** Title and description share the date and the day's first facts. One og pair, no image. */
export function briefingPageMeta(
  briefing: Pick<Briefing, "date" | "marketTone">,
): Metadata {
  const date = formatBriefingDate(briefing.date);
  const facts = briefingFacts(enOf(briefing.marketTone));
  const title = `${date}: ${facts}`;
  const description = `${date}. ${facts}`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}
