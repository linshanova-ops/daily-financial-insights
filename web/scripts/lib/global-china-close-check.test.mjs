import assert from "node:assert/strict";
import test from "node:test";
import { checkGlobalChinaNoCloseDup } from "./global-china-close-check.mjs";

test("globalChanged rejects AP close chips", () => {
  const r = checkGlobalChinaNoCloseDup({
    globalChanged: [
      {
        text: "S&P up",
        sources: [{ label: "Boston 25 AP Monday wrap", href: "https://example.com" }],
      },
    ],
    chinaChanged: [],
  });
  assert.equal(r.ok, false);
  assert.match(r.message, /marketDashboard/);
});

test("mail-order bullets pass", () => {
  const r = checkGlobalChinaNoCloseDup({
    globalChanged: [
      {
        text: "Greer on truce",
        sources: [{ label: "彭博财经早茶 Sep 22", href: "https://www.bloomberg.com/asia" }],
      },
    ],
    chinaChanged: [
      {
        text: "Pan symposium",
        sources: [{ label: "第一财经 央行座谈会", href: "https://www.yicai.com" }],
      },
    ],
  });
  assert.equal(r.ok, true);
});
