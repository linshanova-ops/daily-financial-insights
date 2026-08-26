import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { themesByGrade } from "./theme-grade-order.ts";

describe("themesByGrade", () => {
  it("orders STRONG then MODERATE then WEAK and keeps same-grade order", () => {
    const ids = themesByGrade([
      { id: "a", grade: "MODERATE" },
      { id: "b", grade: "STRONG" },
      { id: "c", grade: "WEAK" },
      { id: "d", grade: "STRONG" },
      { id: "e", grade: "MODERATE" },
    ]).map((t) => t.id);
    assert.deepEqual(ids, ["b", "d", "a", "e", "c"]);
  });
});
