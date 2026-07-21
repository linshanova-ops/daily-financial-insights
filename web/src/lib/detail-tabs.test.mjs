// web/src/lib/detail-tabs.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detailTabFromHash,
  isKnownDetailHash,
  DETAIL_TABS,
} from "./detail-tabs.ts";

describe("detailTabFromHash", () => {
  it("defaults to global for empty or unknown hash", () => {
    assert.equal(detailTabFromHash(""), "global");
    assert.equal(detailTabFromHash("#"), "global");
    assert.equal(detailTabFromHash("#nope"), "global");
  });

  it("maps section hashes to tabs", () => {
    assert.equal(detailTabFromHash("#global-situation"), "global");
    assert.equal(detailTabFromHash("#china-situation"), "china");
    assert.equal(detailTabFromHash("#asset-framework"), "assets");
    assert.equal(detailTabFromHash("#signals"), "signals");
    assert.equal(detailTabFromHash("#watch"), "watch");
    assert.equal(detailTabFromHash("#sources"), "sources");
    assert.equal(detailTabFromHash("#sources-caveats"), "sources");
    assert.equal(detailTabFromHash("#detail"), "global");
  });

  it("recognizes known detail hashes", () => {
    assert.equal(isKnownDetailHash(""), false);
    assert.equal(isKnownDetailHash("#"), false);
    assert.equal(isKnownDetailHash("#nope"), false);
    assert.equal(isKnownDetailHash("#china-situation"), true);
    assert.equal(isKnownDetailHash("#detail"), true);
    assert.equal(isKnownDetailHash("#sources-caveats"), true);
  });

  it("accepts bare ids without hash", () => {
    assert.equal(detailTabFromHash("china-situation"), "china");
  });

  it("exposes six tabs in order", () => {
    assert.deepEqual(
      DETAIL_TABS.map((t) => t.id),
      ["global", "china", "assets", "signals", "watch", "sources"],
    );
  });
});
