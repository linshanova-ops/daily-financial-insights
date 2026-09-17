import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkThemeCards } from "./theme-card-check.mjs";

const good = {
  id: "oil",
  grade: "STRONG",
  fact: "CNBC: WTI settled at $91.01. Wright: 17 million b/d moved through Hormuz on Monday.",
  factSources: [{ label: "CNBC", href: "https://x" }],
  mechanism:
    "WTI at $91.01 still holds a war premium while Hormuz flows stay disrupted. CICC (2 September): the strait, not OPEC, sets the price. OPEC+ meets on 6 September.",
};

describe("checkThemeCards", () => {
  it("passes a tight card", () => {
    assert.equal(checkThemeCards({ themeCards: [good] }).ok, true);
  });
  it("passes a fullwidth Cite: fact line", () => {
    const fact = "财经早茶 能源：WTI settled at $91.01. Wright: Hormuz stayed shut on Monday.";
    assert.equal(checkThemeCards({ themeCards: [{ ...good, fact }] }).ok, true);
  });
  it("passes a 2026 year in fact that So what does not repeat", () => {
    const fact =
      "Fed: the 2026 SEP median is 4.1%. CNBC: WTI settled at $91.01.";
    const mechanism =
      "A 4.1% year-end median next to WTI at $91.01 is the hike leaving oil as the inflation input. CICC (2 September): the strait, not OPEC, sets the price. OPEC+ meets on 6 September.";
    assert.equal(checkThemeCards({ themeCards: [{ ...good, fact, mechanism }] }).ok, true);
  });
  it("fails a fact dump", () => {
    const fact = Array(7).fill("AP: the S&P rose 0.5%.").join(" ");
    assert.equal(checkThemeCards({ themeCards: [{ ...good, fact }] }).ok, false);
  });
  it("fails a one-sentence so-what", () => {
    const mechanism = "Oil holds a war premium into 6 September.";
    assert.match(
      checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message,
      /2–4/,
    );
  });
  it("fails a fact line without Cite:", () => {
    const fact = "WTI settled at $91.01. Wright: Hormuz stayed shut on Monday.";
    assert.match(
      checkThemeCards({ themeCards: [{ ...good, fact }] }).message,
      /Cite:/,
    );
  });
  it("fails a fact number So what does not use", () => {
    const fact =
      "CNBC: WTI settled at $91.01. AP: the S&P closed at 7,551.81.";
    assert.match(
      checkThemeCards({ themeCards: [{ ...good, fact }] }).message,
      /unused/,
    );
  });
  it("fails sourcing caveats as so-what", () => {
    const mechanism = "That figure is 09:57 a.m. EDT, not a settle.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /caveat/);
  });
  it("fails the same number on two cards", () => {
    const b = {
      ...good,
      id: "gold",
      fact: "Kitco: gold rose as WTI held $91.01. AP: the metal followed oil.",
    };
    assert.match(checkThemeCards({ themeCards: [good, b] }).message, /91.01 already/);
  });
  it("fails a so-what number the fact never printed", () => {
    const mechanism =
      "Brent at $95.63 says the premium is holding. CICC (2 September): the strait, not OPEC, sets the price. OPEC+ meets on 6 September.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /95.63 that is not/);
  });
  it("fails Yahoo quote HTML as a chip", () => {
    const factSources = [{ label: "Yahoo", href: "https://finance.yahoo.com/quote/CL%3DF/" }];
    assert.match(checkThemeCards({ themeCards: [{ ...good, factSources }] }).message, /Yahoo/);
  });
  it("fails Yahoo quote HTML in the fact", () => {
    const fact =
      "Yahoo: WTI at https://finance.yahoo.com/quote/CL=F/ was $91.01. Wright: Hormuz stayed shut.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, fact }] }).message, /Yahoo/);
  });
  it("fails a cloned House (date) on a second card", () => {
    const b = {
      ...good,
      id: "china",
      fact: "PBOC: 7-day RRs were 1620亿元. 上海证券报: Shanghai closed at 3891.6.",
      mechanism:
        "A 1620亿元 backstop under 3891.6 still trades domestic activity. CICC (2 September): this hike does not start a new cycle for A-shares. PBOC ops on 18 September are the next print.",
    };
    assert.match(checkThemeCards({ themeCards: [good, b] }).message, /cloned desk view/);
  });
  it("fails when the last so-what sentence is the desk view", () => {
    const mechanism =
      "WTI at $91.01 still holds a war premium. CICC (2 September): the strait, not OPEC, sets the price.";
    assert.match(
      checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message,
      /last so-what is a desk view/,
    );
  });
  it("fails an undated last so-what sentence", () => {
    const mechanism =
      "WTI at $91.01 still holds a war premium. CICC (2 September): the strait, not OPEC, sets the price. Watch the restart talk.";
    assert.match(
      checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message,
      /dated settle/,
    );
  });
  it("fails a day with no dated desk view on any card", () => {
    const mechanism = "WTI at $91.01 still holds a war premium. OPEC+ meets on 6 September.";
    assert.match(checkThemeCards({ themeCards: [{ ...good, mechanism }] }).message, /desk view/);
  });
  it("fails when every card is the same grade", () => {
    const cards = ["a", "b", "c"].map((id, i) => ({
      ...good,
      id,
      fact: `AP: print ${i} settled at ${90 + i}.10. Wright: Hormuz stayed shut.`,
      mechanism: `${90 + i}.10 is the close. CICC (${i + 1} September): the strait sets the price. OPEC+ meets on 6 September.`,
    }));
    assert.match(checkThemeCards({ themeCards: cards }).message, /grade the tape/);
  });
});
