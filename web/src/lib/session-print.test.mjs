import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionKind, shanghaiQuote } from "./session-print.ts";

const SNAP = "2026-10-28T01:19:25.942Z";

describe("sessionKind at the 09:19 Asia/Shanghai snapshot", () => {
  it("keeps a finished session a close and an open session intraday", () => {
    assert.equal(sessionKind("nikkei", "2026-10-28", SNAP), "intraday");
    assert.equal(sessionKind("kospi", "2026-10-28", SNAP), "intraday");
    assert.equal(sessionKind("brent", "2026-10-28", SNAP), "intraday");
    assert.equal(sessionKind("gold", "2026-10-28", SNAP), "intraday");
    assert.equal(sessionKind("usdjpy", "2026-10-28", SNAP), "intraday");
    assert.equal(sessionKind("spx", "2026-10-27", SNAP), "close");
    assert.equal(sessionKind("hsi", "2026-10-27", SNAP), "close");
    assert.equal(sessionKind("shanghai", "2026-10-27", SNAP), "close");
    assert.equal(sessionKind("us10y", "2026-10-27", SNAP), "close");
    assert.equal(sessionKind("nikkei", "2026-10-28", "2026-10-28T07:00:00.000Z"), "close");
  });

  it("prints the Shanghai quote time", () => {
    const q = shanghaiQuote(SNAP);
    assert.match(q, /^09:19 /);
    assert.match(q, /GMT\+8|UTC\+8/);
  });
});
