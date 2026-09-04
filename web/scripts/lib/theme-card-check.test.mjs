import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkThemeCards } from "./theme-card-check.mjs";

const good = {
  id: "oil",
  grade: "STRONG",
  fact: "CNBC: WTI settled at $91.01. Wright: 17 million b/d moved through Hormuz on Monday.",
  factSources: [{ label: "CNBC", href: "https://x" }],
  mechanism:
    "Oil holds a war premium while flows stay below 20 million. CICC (2 September): the strait, not OPEC, sets the price. OPEC+ meets this weekend.",
};

describe("checkThemeCards", () => {
  it("passes a tight card", () => {
    assert.equal(checkThemeCards({ themeCards: [good] }).ok, true);
  });
  it("fails a fact dump", () => {
    const fact = Array(7).fill("AP: the S&P rose 0.5%.").join(" ");
    assert.equal(checkThemeCards({ themeCards: [{ ...good, fact }] }).ok, false);
  });
  it("fails sourcing caveats as so-what", () => {
    const mechanism = "That figure is 09:57 a.m. EDT, not a settle.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /caveat/);
  });
  it("fails the same number on two cards", () => {
    const b = { ...good, id: "gold", fact: "Kitco: gold rose as WTI held $91.01." };
    assert.match(checkThemeCards({ themeCards: [good, b] }).message, /91.01 already/);
  });
  it("fails a so-what number the fact never printed", () => {
    const mechanism = "Brent at $95.63 says the premium is holding. OPEC+ meets this weekend.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /95.63 that is not/);
  });
  it("fails Yahoo quote HTML as a chip", () => {
    const factSources = [{ label: "Yahoo", href: "https://finance.yahoo.com/quote/CL%3DF/" }];
    assert.match(checkThemeCards({ themeCards: [{ ...good, factSources }] }).message, /Yahoo/);
  });
  it("fails a day with no dated desk view on any card", () => {
    const mechanism = "Oil holds a war premium. OPEC+ meets this weekend.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /desk view/);
  });
  it("fails when every card is the same grade", () => {
    const cards = ["a", "b", "c"].map((id, i) => ({ ...good, id, fact: `AP: print ${i}.` }));
    assert.match(checkThemeCards({ themeCards: cards }).message, /grade the tape/);
  });
});
