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
- Pre-publish: writing skill **accuracy gate** must pass before sync
- **Site-wide automated accuracy scan (required):** from `web/`, run `npm run scan-links`
  - Walks **every** `href` in all briefing YAML fields (any section) and every `https?://` URL under `web/src`
  - For each sourced claim (summary / global / China / figures / asset framework / signals): fetches the cited page(s) and checks (1) source year/validity and (2) that distinctive claim numbers appear in the page text (union across multi-source facts)
  - Host adapters: 华尔街见闻 article API, Yahoo chart API, BOK `menuNo` fix; **BLS/SEC** via declared bot User-Agent (`syravocado-link-audit/2.0 research@…`); **TSMC IR** Cloudflare blocks are resolved through the matching SEC EDGAR 6-K exhibit (same prints)
  - Fails on denylisted IDs, wrong publication years (e.g. wallstreetcn `3751205` = 2025), unreachable non-hub articles, or claims whose numbers are missing from cited pages
  - Denylist: `web/scripts/rejected-source-ids.json`
  - Wired into `prebuild`, GitHub Pages deploy, and the Refresh generator — publish must not proceed on FAIL

## If a reader finds an error

Correct the briefing YAML (or static `href`), re-run `npm run sync-data && npm run scan-links`, add the bad id/URL to `rejected-source-ids.json` if it was a new stale cite, note the rejection in `singleSource` / caveats when removed, and push so Pages redeploys.
