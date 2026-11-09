import type { Metadata } from "next";
import type { Briefing } from "./types";
import { enOf, zhOf } from "./lang-text";
import { readerLine } from "../../scripts/lib/reader-shorthand.mjs";
import { dropRestatedScale } from "../../scripts/lib/scale-paren.mjs";

export { dropRestatedScale };

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

function firstLine(tone: string): string {
  const text = dropRestatedScale(tone).replace(/\s+/g, " ").trim();
  const first =
    text.split(/(?<=[。！？])|(?<=[.!?])(?=\s|$)/).filter(Boolean)[0] || text;
  return first.replace(/[。.!]$/, "");
}

function shortDate(date: string, lang: "en" | "zh"): string {
  const [, m, d] = date.split("-").map(Number);
  if (lang === "zh") return `${m}月${d}日`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Date, one line from that day's own text, and the brand. */
export function briefingTitles(
  briefing: Pick<Briefing, "date" | "marketTone">,
): { en: string; zh: string } {
  return {
    en: `${shortDate(briefing.date, "en")} financial briefing｜${readerLine(firstLine(enOf(briefing.marketTone)), "en")}｜Syravocado`,
    zh: `${shortDate(briefing.date, "zh")}金融简报｜${readerLine(firstLine(zhOf(briefing.marketTone)))}｜Syravocado`,
  };
}

export function briefingTitleScript(
  briefing: Pick<Briefing, "date" | "marketTone">,
): string {
  const titles = briefingTitles(briefing);
  return `(function(){var en=${JSON.stringify(titles.en)},zh=${JSON.stringify(titles.zh)};function apply(){document.title=document.documentElement.dataset.lang==="zh"?zh:en}apply();new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:["data-lang"]})})();`;
}

/** The tab title is one line. The longer facts stay in the description. */
export function briefingPageMeta(
  briefing: Pick<Briefing, "date" | "marketTone">,
): Metadata {
  const date = formatBriefingDate(briefing.date);
  const facts = dropRestatedScale(briefingFacts(enOf(briefing.marketTone)));
  const titles = briefingTitles(briefing);
  const description = `${date}. ${facts}`;
  return {
    title: { absolute: titles.en },
    description,
    openGraph: { title: titles.en, description },
  };
}
