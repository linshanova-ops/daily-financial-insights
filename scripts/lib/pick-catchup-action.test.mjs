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
/** Live desktop leftover shape (MCP / list): repoUrl + bcId + createdAtMs. */
const live = {
  bcId: "bc-d11b544c-9ca0-40ab-8f84-761d043a85d1",
  status: "RUNNING",
  createdAtMs: Date.parse("2026-08-17T05:26:00.000Z"),
  repoUrl: "https://github.com/linshanova-ops/daily-financial-insights",
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
  it("archives a desktop leftover that only has repoUrl/bcId/createdAtMs", () => {
    const r = catchupAction([live], slot);
    assert.equal(r.action, "archive");
    assert.equal(r.agent.bcId, live.bcId);
  });
  it("skips when today's 09:00 agent is already running", () => {
    assert.equal(catchupAction([todays], slot).action, "skip");
  });
});
