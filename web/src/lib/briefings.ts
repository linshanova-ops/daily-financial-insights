import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Briefing, BriefingFrontmatter } from "./types";
import { formatBriefingDate } from "./briefings-format";

export { formatBriefingDate };

const CONTENT_DIR = path.join(process.cwd(), "content", "briefings");

function isBriefing(data: BriefingFrontmatter): data is BriefingFrontmatter {
  return Boolean(data?.date && data?.title && data?.marketTone);
}

export function getAllBriefings(): Briefing[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"));

  const briefings: Briefing[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data } = matter(raw);
    const frontmatter = data as BriefingFrontmatter;

    if (!isBriefing(frontmatter)) {
      console.warn(`[briefings] Skipping malformed file: ${file}`);
      continue;
    }

    briefings.push({
      ...frontmatter,
      slug: frontmatter.date,
    });
  }

  return briefings.sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestBriefing(): Briefing | null {
  return getAllBriefings()[0] ?? null;
}

export function getBriefingByDate(date: string): Briefing | null {
  return getAllBriefings().find((item) => item.date === date) ?? null;
}

export function getAllBriefingDates(): string[] {
  return getAllBriefings().map((item) => item.date);
}
