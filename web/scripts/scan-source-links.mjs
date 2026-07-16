/**
 * Site-wide source-link accuracy scan.
 *
 * Walks EVERY href that can appear on the published site:
 *   - all briefing YAML/JSON fields (any nest level)
 *   - hardcoded https?:// URLs in web/src (pages, catalogs, pipeline)
 *
 * Fails the process on denylisted IDs/URLs or URL-embedded years that
 * predate the briefing's calendar year. This is machine enforcement for
 * docs/CONTENT_ACCURACY.md — not a prompt-only section check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const contentDir = path.join(webRoot, "content", "briefings");
const srcDir = path.join(webRoot, "src");
const rejectPath = path.join(__dirname, "rejected-source-ids.json");

const rejects = JSON.parse(fs.readFileSync(rejectPath, "utf8"));
const deniedWallIds = new Set(rejects.wallstreetcnArticleIds ?? []);
const deniedBbIds = new Set(rejects.blockbeatsFlashIds ?? []);
const deniedSubstrings = (rejects.exactUrlSubstrings ?? []).map((s) =>
  s.toLowerCase(),
);

/** @typedef {{ href: string, where: string, briefingYear?: number }} LinkHit */

function collectHrefs(value, where, out, briefingYear) {
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      collectHrefs(item, `${where}[${i}]`, out, briefingYear),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "href" && typeof child === "string" && child.trim()) {
        out.push({ href: child.trim(), where: `${where}.href`, briefingYear });
      } else {
        collectHrefs(child, `${where}.${key}`, out, briefingYear);
      }
    }
  }
}

function loadBriefingLinks() {
  /** @type {LinkHit[]} */
  const hits = [];
  if (!fs.existsSync(contentDir)) return hits;

  for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
    const { data } = matter(raw);
    if (!data?.date) continue;
    const year = Number(String(data.date).slice(0, 4));
    collectHrefs(data, file, hits, Number.isFinite(year) ? year : undefined);
  }
  return hits;
}

function walkFiles(dir, extRe, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, extRe, out);
    } else if (extRe.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function loadSrcLinks() {
  /** @type {LinkHit[]} */
  const hits = [];
  const files = walkFiles(srcDir, /\.(tsx?|jsx?|mjs|css)$/);
  const urlRe = /https?:\/\/[^\s"'`)\]]+/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(webRoot, file);
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      const href = match[0].replace(/[.,;]+$/, "");
      hits.push({ href, where: rel });
    }
  }
  return hits;
}

function wallstreetcnArticleId(href) {
  const m = href.match(/wallstreetcn\.com\/articles\/(\d+)/i);
  return m?.[1] ?? null;
}

function blockbeatsFlashId(href) {
  const m = href.match(/theblockbeats\.info\/flash\/(\d+)/i);
  return m?.[1] ?? null;
}

/** Years clearly embedded as content dates in the URL path/filename. */
function yearsInUrl(href) {
  const years = new Set();
  let m;
  const pathYear = /(?:^|\/)(20\d{2})(?:\/|-)/g;
  while ((m = pathYear.exec(href)) !== null) years.add(Number(m[1]));
  const bls = href.match(/(?:cpi|ppi)_(\d{4})(20\d{2})\.htm/i);
  if (bls) years.add(Number(bls[2]));
  const iso = href.match(/(20\d{2})-\d{2}-\d{2}/g);
  if (iso) {
    for (const token of iso) years.add(Number(token.slice(0, 4)));
  }
  return [...years];
}

function evaluateLink(hit) {
  const href = hit.href;
  const lower = href.toLowerCase();
  const problems = [];

  for (const sub of deniedSubstrings) {
    if (lower.includes(sub)) {
      problems.push(`denylisted URL substring (${sub})`);
    }
  }

  const wId = wallstreetcnArticleId(href);
  if (wId && deniedWallIds.has(wId)) {
    problems.push(`denylisted 华尔街见闻 article id ${wId}`);
  }

  const bId = blockbeatsFlashId(href);
  if (bId && deniedBbIds.has(bId)) {
    problems.push(`denylisted BlockBeats flash id ${bId}`);
  }

  if (hit.briefingYear != null) {
    for (const y of yearsInUrl(href)) {
      if (y < hit.briefingYear) {
        problems.push(
          `URL embeds year ${y} but briefing year is ${hit.briefingYear}`,
        );
      }
    }
  }

  return problems;
}

function selfCheck() {
  const sample = evaluateLink({
    href: "https://wallstreetcn.com/articles/3751205",
    where: "self-check",
    briefingYear: 2026,
  });
  if (!sample.length) {
    throw new Error(
      "[scan-links] self-check failed: denylist did not catch 3751205",
    );
  }
}

function main() {
  selfCheck();

  const hits = [...loadBriefingLinks(), ...loadSrcLinks()];
  /** @type {Map<string, { hit: LinkHit, problems: string[] }>} */
  const failures = new Map();

  for (const hit of hits) {
    const problems = evaluateLink(hit);
    if (!problems.length) continue;
    const key = `${hit.href}@@${hit.where}`;
    failures.set(key, { hit, problems });
  }

  const uniqueHrefs = new Set(hits.map((h) => h.href));
  console.log(
    `[scan-links] Scanned ${hits.length} link occurrence(s), ${uniqueHrefs.size} unique href(s) across briefings + web/src.`,
  );

  if (failures.size === 0) {
    console.log("[scan-links] OK — no denylisted or wrong-year URL patterns.");
    return;
  }

  console.error(
    `[scan-links] FAIL — ${failures.size} link occurrence(s) violate CONTENT_ACCURACY:`,
  );
  for (const { hit, problems } of failures.values()) {
    console.error(`  - ${hit.where}`);
    console.error(`    ${hit.href}`);
    for (const p of problems) console.error(`    · ${p}`);
  }
  console.error(
    "\nFix: replace the cite, add the id to web/scripts/rejected-source-ids.json if newly discovered, then re-run npm run scan-links.",
  );
  process.exit(1);
}

main();
