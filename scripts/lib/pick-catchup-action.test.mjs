import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATCHUP_STUCK_MS,
  pickCatchupAction,
} from "./pick-catchup-action.mjs";

const REPO = "daily-financial-insights";
const slotStartMs = Date.parse("2026-08-18T01:00:00.000Z"); // Beijing 09:00
const leftover = {
  agentId: "bc-old",
  status: "running",
  createdAt: Date.parse("2026-08-17T05:26:00.000Z"),
  repos: [`https://github.com/linshanova-ops/${REPO}`],
};
const todays = {
  agentId: "bc-today",
  status: "running",
  createdAt: Date.parse("2026-08-18T01:01:00.000Z"),
  repos: leftover.repos,
};

describe("pickCatchupAction", () => {
  it("creates when the cap is free", () => {
    const r = pickCatchupAction([], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + 20 * 60_000,
    });
    assert.equal(r.action, "create");
  });

  it("waits while a leftover still occupies the cap before the stuck window", () => {
    const r = pickCatchupAction([leftover], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + 20 * 60_000,
    });
    assert.equal(r.action, "wait");
    assert.equal(r.agent.agentId, "bc-old");
  });

  it("archives this-repo leftover after the stuck window", () => {
    const r = pickCatchupAction([leftover], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + CATCHUP_STUCK_MS,
    });
    assert.equal(r.action, "archive-and-create");
    assert.equal(r.agent.agentId, "bc-old");
  });

  it("waits on today's 09:00 agent inside the stuck window", () => {
    const r = pickCatchupAction([todays], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + 20 * 60_000,
    });
    assert.equal(r.action, "wait");
    assert.equal(r.agent.agentId, "bc-today");
  });

  it("does not archive today's 09:00 agent after the stuck window", () => {
    const r = pickCatchupAction([todays], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + CATCHUP_STUCK_MS,
    });
    assert.equal(r.action, "wait");
    assert.equal(r.agent.agentId, "bc-today");
  });

  it("does not archive another repo's agent", () => {
    const other = {
      agentId: "bc-other",
      status: "running",
      createdAt: leftover.createdAt,
      repos: ["https://github.com/someone/else"],
    };
    const r = pickCatchupAction([other], {
      repoNeedle: REPO,
      slotStartMs,
      nowMs: slotStartMs + CATCHUP_STUCK_MS,
    });
    assert.equal(r.action, "blocked");
    assert.equal(r.agent.agentId, "bc-other");
  });
});
