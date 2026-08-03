/**
 * One-shot / reusable cleanup of Fund confirmed + review queues.
 * Removes weak-source spam and known false attributions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifySourceTier,
  isConfirmableSource,
  sourceTierLabel,
} from "./fund-sources.mjs";
import { dedupeStoryClusters } from "./fund-signal-match.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fundDir = path.join(root, "web/content/fund");

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(fundDir, name), "utf8"));
}
function write(name, data) {
  fs.writeFileSync(path.join(fundDir, name), `${JSON.stringify(data, null, 2)}\n`);
}

function isFalseAttribution(row) {
  const title = String(row.title || "");
  const fund = String(row.fund || "");
  // Meridiem / Schonfeld article wrongly tagged Citadel
  if (/meridiem/i.test(title) && /citadel/i.test(fund)) return true;
  // "III" SPAC / Ord Shs noise
  if (/shareholder structure|ord shs class|acquisition (?:i{1,3}|iv)\b/i.test(title)) {
    return true;
  }
  return false;
}

export function cleanFundQueues(signals, review) {
  const cleanedSignals = [];
  let droppedSignals = 0;
  for (const row of signals) {
    const tier = classifySourceTier(row);
    const next = {
      ...row,
      sourceTier: tier,
      sourceTierLabel: sourceTierLabel(tier),
    };
    if (isFalseAttribution(next) || !isConfirmableSource(next)) {
      droppedSignals += 1;
      continue;
    }
    cleanedSignals.push(next);
  }

  const cleanedReview = [];
  let droppedReview = 0;
  for (const row of review) {
    if (
      /命中「III」/.test(String(row.reason || "")) ||
      /shareholder structure|ord shs class|acquisition (?:i{1,3}|iv)\b/i.test(
        String(row.title || ""),
      )
    ) {
      droppedReview += 1;
      continue;
    }
    const tier = classifySourceTier(row);
    cleanedReview.push({
      ...row,
      source: row.source || null,
      sourceTier: tier,
      sourceTierLabel: sourceTierLabel(tier),
    });
  }

  const dedupedSignals = dedupeStoryClusters(cleanedSignals);
  const collapsedStories = cleanedSignals.length - dedupedSignals.length;

  return {
    signals: dedupedSignals,
    review: cleanedReview,
    droppedSignals,
    droppedReview,
    collapsedStories,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const signals = read("signals.json");
  const review = read("review.json");
  const result = cleanFundQueues(signals, review);
  write("signals.json", result.signals);
  write("review.json", result.review);
  console.log(
    `[fund-clean] signals ${signals.length}→${result.signals.length} (−${result.droppedSignals} weak/false, −${result.collapsedStories} story dupes); review ${review.length}→${result.review.length} (−${result.droppedReview})`,
  );
}
