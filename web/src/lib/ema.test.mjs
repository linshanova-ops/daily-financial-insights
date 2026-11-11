import assert from "node:assert/strict";
import { it } from "node:test";
import { EMA_FORM, emaPrompts, markShown, readerId, shanghaiDay, shownToday } from "./ema.ts";

it("renders no EMA modals until the form url is set", () => {
  assert.deepEqual(emaPrompts({ url: "" }), []);
  assert.equal(emaPrompts({ url: "https://x/formResponse" }).length, 2);
  if (!EMA_FORM.url) assert.deepEqual(emaPrompts(EMA_FORM), []);
});

it("keeps one reader id, stored when it can be, per page when it can't", () => {
  const blocked = { getItem() { throw new Error("blocked"); } };
  globalThis.localStorage = blocked;
  const page = readerId();
  assert.match(page, /^r-[0-9a-f]{8}$/);
  assert.equal(readerId(), page);
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const kept = readerId();
  assert.equal(store.get("ema-reader"), kept);
  assert.equal(readerId(), kept);
});

it("shows each prompt once per Asia/Shanghai day, per page when storage is blocked", () => {
  assert.equal(shanghaiDay(new Date("2026-11-10T15:59:00Z")), "2026-11-10");
  assert.equal(shanghaiDay(new Date("2026-11-10T16:00:00Z")), "2026-11-11");
  const store = new Map([["ema-themes", "2026-01-01"]]);
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(shownToday("themes"), false);
  markShown("themes");
  assert.equal(store.get("ema-themes"), shanghaiDay());
  assert.equal(shownToday("themes"), true);
  assert.equal(shownToday("market-closes"), false);
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(shownToday("market-closes"), false);
  markShown("market-closes");
  assert.equal(shownToday("market-closes"), true);
});
