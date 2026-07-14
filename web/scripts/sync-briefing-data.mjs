import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const contentDir = path.join(root, "content", "briefings");
const outDir = path.join(root, "public", "data");
const briefingsOutDir = path.join(outDir, "briefings");

function loadBriefings() {
  if (!fs.existsSync(contentDir)) return [];

  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
      const { data } = matter(raw);
      if (!data?.date || !data?.title) {
        console.warn(`[sync] Skipping malformed briefing: ${file}`);
        return null;
      }
      return { ...data, slug: data.date };
    })
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));
}

const briefings = loadBriefings();

fs.mkdirSync(briefingsOutDir, { recursive: true });

for (const briefing of briefings) {
  const target = path.join(briefingsOutDir, `${briefing.date}.json`);
  fs.writeFileSync(target, `${JSON.stringify(briefing, null, 2)}\n`);
}

const index = {
  generatedAt: new Date().toISOString(),
  latest: briefings[0]?.date ?? null,
  briefings: briefings.map((item) => ({
    date: item.date,
    title: item.title,
    marketTone: item.marketTone,
    coverageWindow: item.coverageWindow,
  })),
};

fs.writeFileSync(
  path.join(outDir, "index.json"),
  `${JSON.stringify(index, null, 2)}\n`,
);

if (briefings[0]) {
  fs.writeFileSync(
    path.join(outDir, "latest.json"),
    `${JSON.stringify(briefings[0], null, 2)}\n`,
  );
}

console.log(
  `[sync] Wrote ${briefings.length} briefing(s). Latest: ${index.latest ?? "none"}`,
);
