#!/usr/bin/env node
// Fails if the 09:00 skill/prompt regresses to today's hang: unbounded
// wait, a second 180 loop, or a backup IMAP cron.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = readFileSync(`${root}/.cursor/skills/weekday-website-update/SKILL.md`, "utf8");
const auto = readFileSync(`${root}/.cursor/automations/weekday-0900-beijing.md`, "utf8");
const yml = readFileSync(`${root}/.github/workflows/inbox-sync.yml`, "utf8");
const fail = (m) => {
  console.error(m);
  process.exit(1);
};

if ((skill.match(/seq 1 180/g) || []).length !== 1) fail("skill: exactly one 180 wait");
if ((yml.match(/^\s+- cron:/gm) || []).length !== 1) fail("inbox-sync: exactly one cron");
if (/cron:\s*"20 1/.test(yml) || /cron:\s*"20 1/.test(skill)) fail("no 09:20 IMAP cron");
if (/until bloomberg-\$TODAY\.md exists/.test(auto)) fail("automation: no unbounded wait");
if (!/# last-kick:/.test(yml)) fail("inbox-sync: last-kick line for on.push");
if (!/last-kick/.test(skill)) fail("skill: kick the same job via last-kick");
if (!/not a second (slot|cron)/i.test(skill)) fail("skill: forbid a second IMAP slot");
if (!/seq 1 20/.test(skill)) fail("skill: short pull after kick, not another 180");
console.log("ok");
