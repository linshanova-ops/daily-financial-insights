import assert from "node:assert/strict";
import { it } from "node:test";
import { EMA_FORM, emaPrompts, readerId } from "./ema.ts";

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
