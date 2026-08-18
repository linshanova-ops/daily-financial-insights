import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catchupAction } from "./pick-catchup-action.mjs";

const slot = Date.parse("2026-08-18T01:00:00.000Z");
const leftover = {
  agentId: "bc-old",
  status: "running",
  createdAt: Date.parse("2026-08-17T05:26:00.000Z"),
  repos: ["https://github.com/linshanova-ops/daily-financial-insights"],
};
const todays = {
  ...leftover,
  agentId: "bc-today",
  createdAt: Date.parse("2026-08-18T01:01:00.000Z"),
};

describe("catchupAction", () => {
  it("creates when the cap is free", () => {
    assert.equal(catchupAction([], slot).action, "create");
  });
  it("archives a leftover occupying the cap", () => {
    const r = catchupAction([leftover], slot);
    assert.equal(r.action, "archive");
    assert.equal(r.agent.agentId, "bc-old");
  });
  it("skips when today's 09:00 agent is already running", () => {
    assert.equal(catchupAction([todays], slot).action, "skip");
  });
});
