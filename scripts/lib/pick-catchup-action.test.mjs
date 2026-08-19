import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catchupAction,
  listRows,
  agentId,
} from "./pick-catchup-action.mjs";

const slot = Date.parse("2026-08-19T01:00:00.000Z");
const leftoverSdk = {
  agentId: "bc-old",
  status: "running",
  createdAt: Date.parse("2026-08-17T05:26:00.000Z"),
  repos: ["https://github.com/linshanova-ops/daily-financial-insights"],
};
const leftoverLive = {
  bcId: "bc-d11b544c-9ca0-40ab-8f84-761d043a85d1",
  status: "RUNNING",
  createdAtMs: Date.parse("2026-08-17T05:26:01.753Z"),
  repoUrl: "https://github.com/linshanova-ops/daily-financial-insights",
};
const todays = {
  ...leftoverLive,
  bcId: "bc-today",
  createdAtMs: Date.parse("2026-08-19T01:01:00.000Z"),
};

describe("catchupAction", () => {
  it("creates when the cap is free", () => {
    assert.equal(catchupAction([], slot).action, "create");
  });
  it("sends to an SDK-shaped leftover occupying the cap", () => {
    const r = catchupAction([leftoverSdk], slot);
    assert.equal(r.action, "send");
    assert.equal(agentId(r.agent), "bc-old");
  });
  it("sends to a live leftover (repoUrl / bcId / createdAtMs / RUNNING)", () => {
    const r = catchupAction([leftoverLive], slot);
    assert.equal(r.action, "send");
    assert.equal(agentId(r.agent), leftoverLive.bcId);
  });
  it("skips when today's 09:00 agent is already running", () => {
    assert.equal(catchupAction([todays], slot).action, "skip");
  });
  it("reads Agent.list { items } and { agents }", () => {
    assert.equal(listRows({ items: [leftoverLive] })[0].bcId, leftoverLive.bcId);
    assert.equal(listRows({ agents: [leftoverLive] })[0].bcId, leftoverLive.bcId);
  });
  it("sends when repos is [{ url }] not a string", () => {
    const r = catchupAction(
      [
        {
          agentId: "bc-obj",
          status: "running",
          createdAt: Date.parse("2026-08-17T05:26:00.000Z"),
          repos: [{ url: "https://github.com/linshanova-ops/daily-financial-insights" }],
        },
      ],
      slot,
    );
    assert.equal(r.action, "send");
    assert.equal(agentId(r.agent), "bc-obj");
  });
});
