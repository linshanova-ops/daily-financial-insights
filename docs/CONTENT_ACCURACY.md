# Website content accuracy policy

**Standing requirement (from 2026-07-16):** every published syravocado briefing must be valid and accurate. Prefer a shorter briefing over a wrong figure or a wrong-year source.

## Non-negotiables

1. **Every hard number has a dated source** in the coverage window, with a working `href` that supports the claimed level.
2. **Calendar year must match.** Discard aggregator flashes that only say “7月15日” / “Jul 15” without a verifiable year if the level conflicts with same-day independent tape (example: BTC $116k flash vs Jul 2026 mid-$60k).
3. **华尔街见闻 year gate.** Do not cite a wallstreetcn.com article for an index close or policy print unless the page shows the coverage **calendar year** (or a same-day primary/tier-2 source confirms the level). Month-day-only A/H wraps are rejectable. Treat IDs near a known-rejected stale piece as suspect (e.g. 37512xx cluster around rejected 2025 wraps 3751205 / 3751275) — prefer primary closes (京报网 / exchange / The Standard / SED) and newer IDs that explicitly say 2026.
4. **Primary sources for official prints** — BLS, Fed, Treasury, PBOC, NBS, company IR. Secondary desks for color only.
5. **Index closes, not mix-ups** — quote the named index’s official close/settle; never swap Kospi/Nikkei/Kosdaq or open vs close without labels. Prefer exchange/official media for Shanghai/Hang Seng/Kospi over aggregator day wraps.
6. **Beat/miss vs consensus**, not vs prior. Cooler-than-expected CPI/PPI is a **miss**.
7. **PBOC 亿元 conversion** — `100亿元` = **CNY10bn**. Net OMO = ops − maturity.
8. **Crypto triangulation** — BlockBeats alone is not enough for a published BTC/ETH print; pair with a dated Cointelegraph / CoinDesk / Yahoo (or similar) quote.
9. **Href integrity** — if the linked page does not support the number, replace the source; do not keep a convenient wrong link.
10. **Reject rather than invent** — if a figure cannot be verified, omit it or mark `single-source` in caveats. Never invent.

## Pipeline enforcement

- Skills: `daily-financial-briefing`, `gathering-financial-news`, `writing-daily-financial-report`
- Generator prompt: `scripts/generate-daily-briefing.mjs` (Refresh / Actions agent)
- Pre-publish: writing skill **accuracy gate** must pass before `npm run sync-data` and push

## If a reader finds an error

Correct the briefing YAML, re-sync public JSON, note the rejection in `singleSource` / caveats when a bad cite was removed, and push so Pages redeploys.
