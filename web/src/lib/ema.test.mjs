import assert from "node:assert/strict";
import { it } from "node:test";
import { EMA_FORM, emaPrompts } from "./ema.ts";

it("renders no EMA modals until the form url is set", () => {
  assert.deepEqual(emaPrompts({ url: "" }), []);
  assert.equal(emaPrompts({ url: "https://x/formResponse" }).length, 2);
  if (!EMA_FORM.url) assert.deepEqual(emaPrompts(EMA_FORM), []);
});
