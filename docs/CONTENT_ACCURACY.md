# Website content accuracy policy

**Standing requirement (from 2026-07-16):** every published syravocado briefing must be valid and accurate. Prefer a shorter briefing over a wrong figure or a wrong-year source.

## Non-negotiables

1. **Every hard number has a dated source** in the coverage window, with a working `href` that supports the claimed level.
2. **Calendar year must match.** Discard aggregator flashes that only say “7月15日” / “Jul 15” without a verifiable year if the level conflicts with same-day independent tape (example: BTC $116k flash vs Jul 2026 mid-$60k).
3. **华尔街见闻 year gate.** Do not cite a wallstreetcn.com article for an index close or policy print unless the page shows the coverage **calendar year** (or a same-day primary/tier-2 source confirms the level). Month-day-only A/H wraps are rejectable. Treat IDs near a known-rejected stale piece as suspect (e.g. 37512xx cluster around rejected 2025 wraps 3751205 / 3751275) — prefer primary closes (京报网 / exchange / The Standard / SED) and newer IDs that explicitly say 2026.
4. **Primary sources for official prints** — BLS, Fed, Treasury, PBOC, NBS, company IR. Secondary desks for color only.
5. **Index closes, not mix-ups** — quote the named index’s official close/settle; never swap Kospi/Nikkei/Kosdaq or open vs close without labels. Prefer exchange/official media for Shanghai/Hang Seng/Kospi over aggregator day wraps.
6. **Beat/miss vs estimate**, not vs prior. **Cooler / less than estimate = miss estimate**; **hotter / more than estimate = beat estimate** (CPI, PPI, GDP, payrolls, claims, etc.). Do not swap market tone for the print label.
7. **All CNY/RMB 亿元 conversions** — `10亿元` = **CNY1bn**; `100亿元` = **CNY10bn**. Never copy an `亿元` numeral unchanged into a `bn` label (`51.79亿元` = **CNY5.179bn**, not CNY51.79bn). PBOC net OMO = ops − maturity.
8. **Crypto triangulation** — BlockBeats alone is not enough for a published BTC/ETH print; pair with a dated Cointelegraph / CoinDesk / Yahoo (or similar) quote. Cover 律动 four books when the tape has them (BTC/ETF/MSTR/stables/exchanges/reg; tech/AI chain; street ratings/targets; macro/CB/rates/FX/commodities) on matching Themes.
9. **Href integrity** — if the linked page does not support the number, replace the source; do not keep a convenient wrong link. **Aggregator pages (BlockBeats, etc.):** omit embed-only figures that do not appear in CI-fetchable HTML.
10. **Reject rather than invent** — if a figure cannot be verified, omit it or mark `single-source` in caveats. Never invent.
11. **Never write CLAIM on the website.** FACT vs CLAIM is an agent gate. Name the desk (`财经早茶`, `律动`, `CICC`).
12. **Deal size ≠ company proceeds.** For an IPO or placement, keep apart new shares, shares sold by existing holders, any concurrent private placement, net proceeds to the company, and valuation. A total deal size names what it includes (e.g. holders' sale, placement). "Up to", "expected" or a price range states the basis (top of range, midpoint, before the overallotment option). Cite the filing (SEC S-1/F-1, HKEX prospectus) for net proceeds; a desk's headline total stays attributed to that desk. Same split in EN and ZH.
13. **Market snapshot labels each quote.** Each row carries one short quote-type tag (close, settle, intraday with Beijing time, official yield, 24h) and, when the feed names it, the futures contract month inline (`contract`, written by `fetch-market-closes.mjs`). Dates and numbered notes sit in one footnote block under the snapshot; row sources and the snapshot `note` stay in the data but are not shown on the site; a row with a note gets a superscript marker. When the text cites a different quote for the same asset (a settle vs the snapshot's intraday, a desk's market-close yield vs the Treasury curve), add a `printNote` on that row after the final inject (it renders as that row's footnote) and a clause beside the number in the text. Unconfirmed fields stay empty and are listed as missing.
14. **Event calendar status.** A row without `timeBeijing` sets `timing`: `all-day` (holiday, market closure, effective date), `tbd` (event confirmed, time not), or `unconfirmed` (the event itself is not confirmed). Holidays default to all day. The page hides every timed row scheduled before the issue's `publishedAt` (Beijing), with no past label; archive pages judge by their own `publishedAt`. An all-day row on or after the publish day stays. Say an event happened only with a source.
15. **Say what a number is compared with.** Prior period, a year earlier, or the forecast — name it, and give the forecast and the prior reading when both matter (e.g. "0.4% in October, slower than September's 0.6% but above the 0.3% forecast"). Both languages carry the same numbers, attribution and certainty. Keep reported facts, a source's reading, and the site's conditional judgment ("could", "若…可能") apart. A fund-flow figure gives its date, net amount and source; a holdings change needs holdings data.
16. **Sources beside numbers; silent fixes.** Put the source next to the number, event or chart it supports, preferring the official release, exchange data, company filing or regulator. A chart whose image and numbers come from different places cites both (`figures[].sources`). A subscription mail cite names the institution, product and date (and edition when the mail carries one), plus a public primary link for the numbers. After publish, fix a number, event time or attribution silently in place: keep `publishedAt`, add no updated time and no correction note anywhere on the site.

## Pipeline enforcement

- Skills: `daily-financial-briefing`, `gathering-financial-news`, `writing-daily-financial-report`
- Generator: `scripts/generate-daily-briefing.mjs` (twice-daily schedule / Actions)
- **Fail-closed publish:** scheduled (and manual) generation never pushes to `main`. It opens PR branch `briefing/YYYY-MM-DD`, CI workflow `briefing-accuracy.yml` must pass **`npm run verify-briefing`**, then the orchestrator auto-merges and dispatches Pages deploy (GITHUB_TOKEN merges do not trigger push workflows). On CI failure the agent rewrites (up to 3 attempts). If still red, the PR stays open and the live site is unchanged.
- Pre-publish: writing skill **accuracy gate** must pass before sync
- **Site-wide automated publish gate (required):** from `web/`, run **`npm run verify-briefing`**
  1. Regenerates JSON from markdown (`sync-data`)
  2. **Fails if `web/public/data/briefings/*.json` or `latest.json` are not committed** with the markdown (top CI failure mode)
  3. Runs `scan-links` (fetch + evidence on every cited claim)
  - Walks **every** `href` in all briefing YAML fields (any section) and every `https?://` URL under `web/src`
  - For each sourced claim (summary / global / China / figures / asset framework / signals): fetches the cited page(s) and checks (1) source year/validity and (2) that distinctive claim numbers appear in the page text (union across multi-source facts)
  - Fails if a briefing copies the same `亿元` numeral into a `bn` label; this catches the common 10× translation error before publish
  - Host adapters: 华尔街见闻 article API, Yahoo chart API, BOK `menuNo` fix; **BLS/SEC** via declared bot User-Agent (`syravocado-link-audit/2.0 research@…`); **TSMC IR** Cloudflare blocks are resolved through the matching SEC EDGAR 6-K exhibit (same prints)
  - CI soft-fallback: if a dated article URL (`/YYYY/MM/DD/`) is IP-blocked (e.g. SED from GitHub Actions) but embeds the briefing year, treat as year-trusted with a warning — do not block Pages deploy
  - Fails on denylisted IDs, wrong publication years (e.g. wallstreetcn `3751205` = 2025), unreachable non-hub articles, or claims whose numbers are missing from cited pages
  - Denylist: `web/scripts/rejected-source-ids.json`
  - Wired into `prebuild`, GitHub Pages deploy, and the scheduled generator — publish must not proceed on FAIL

## If a reader finds an error

Correct the briefing YAML (or static `href`), keep `publishedAt` and add no updated time or correction note (rule 16), re-run **`npm run verify-briefing`**, add the bad id/URL to `rejected-source-ids.json` if it was a new stale cite, note the rejection in `singleSource` / caveats when removed, and push so Pages redeploys.
