import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  evaluatePrPublishState,
  filterActionableChecks,
} from "./lib/briefing-publish-helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("filterActionableChecks", () => {
  it("drops Netlify noise and keeps accuracy gate", () => {
    const out = filterActionableChecks([
      { name: "netlify/linshanova/deploy-preview", conclusion: "CANCELLED" },
      { name: "scan-links", conclusion: "SUCCESS", status: "COMPLETED" },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].name, "scan-links");
  });
});

describe("evaluatePrPublishState", () => {
  it("treats MERGED PR as success (duplicate-run race)", () => {
    const r = evaluatePrPublishState({
      prState: "MERGED",
      checks: [],
    });
    assert.equal(r.state, "success");
  });

  it("treats CLOSED unmerged PR as closed", () => {
    const r = evaluatePrPublishState({
      prState: "CLOSED",
      checks: [{ name: "scan-links", conclusion: "SUCCESS", status: "COMPLETED" }],
    });
    assert.equal(r.state, "closed");
  });

  it("waits when draft has no actionable checks yet", () => {
    const r = evaluatePrPublishState({
      prState: "OPEN",
      checks: [],
    });
    assert.equal(r.state, "waiting");
    assert.equal(r.actionable, 0);
  });

  it("returns success when accuracy gate is green", () => {
    const r = evaluatePrPublishState({
      prState: "OPEN",
      checks: [
        { name: "Header rules - netlify.toml", conclusion: "SUCCESS", status: "COMPLETED" },
        { name: "scan-links", conclusion: "SUCCESS", status: "COMPLETED" },
      ],
    });
    // netlify-named check is filtered; scan-links alone is enough
    assert.equal(r.state, "success");
    assert.equal(r.actionable, 1);
  });

  it("returns failure when accuracy gate fails", () => {
    const r = evaluatePrPublishState({
      prState: "OPEN",
      checks: [
        { name: "scan-links", conclusion: "FAILURE", status: "COMPLETED" },
      ],
    });
    assert.equal(r.state, "failure");
    assert.equal(r.failing, 1);
  });

  it("waits while checks are in progress", () => {
    const r = evaluatePrPublishState({
      prState: "OPEN",
      checks: [{ name: "scan-links", status: "IN_PROGRESS" }],
    });
    assert.equal(r.state, "waiting");
    assert.equal(r.pending, 1);
  });
});
