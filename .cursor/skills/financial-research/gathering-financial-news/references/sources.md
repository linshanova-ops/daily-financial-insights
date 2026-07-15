# Source Guide for Financial News Gathering

## Quality Tiers

| Tier | Use | Examples |
|------|-----|----------|
| 1 — Primary | Authoritative for facts and figures | Central bank sites (federalreserve.gov, ecb.europa.eu, pbc.gov.cn), statistics agencies (BLS, Eurostat, stats.gov.cn), exchange announcements, company filings |
| 2 — Wire & major financial press | Default for daily news | Reuters, Bloomberg, Financial Times, Wall Street Journal, Nikkei, AP |
| 3 — Reputable secondary | Fill gaps, cross-check | CNBC, MarketWatch, Yahoo Finance, Barron's, The Economist |
| 4 — Aggregators & social | Leads only — always verify against tier 1–3 | Google News, Reddit, X/Twitter, Seeking Alpha |

Rule: prefer at least one tier 1–2 source for signal-driving items. If only tier 3–4 coverage exists, the item may still be used but must be marked `single-source` and flagged in the report's caveats. Tier 4 alone is never sufficient for a STRONG signal.

## US Market Coverage (required daily sweep)

Primary (tier 1) — always for official numbers:
- **Federal Reserve (federalreserve.gov)** — statements, speeches, testimony, MPR, minutes
- **BLS (bls.gov)** — CPI, PPI, employment; **BEA (bea.gov)** — GDP, PCE
- **US Treasury (treasury.gov)** — daily yield curve, auctions, TIC flows
- **CME FedWatch** — market-implied Fed path (cite the probability, dated)
- **SEC filings / company IR** — earnings and guidance for market-moving names

Market/press (tier 2–3):
- **Reuters, Bloomberg, WSJ, Financial Times** — default wires for US market moves
- **CNBC, MarketWatch, Barron's** — same-day tape color, cross-check vs settles
- **Morningstar/Dow Jones settle reports** — COMEX/NYMEX official settles (gold, oil)

## China Coverage

English-language:
- **Caixin Global** — best independent Chinese financial journalism; strong on property, banking, local debt
- **South China Morning Post** — broad China business/policy coverage
- **Reuters/Bloomberg China desks** — market moves, policy interpretation
- **Xinhua / State Council (english.gov.cn)** — official policy text; treat as primary source of what was announced, apply judgment on framing

Chinese-language (use when accessible; often faster and more detailed):
- **华尔街见闻 (Wallstreetcn)** — required China/global desk sweep for syravocado; strong on overnight closes, policy calendars, A-share strategy notes, and cross-asset tape (wallstreetcn.com)
- **BlockBeats / 律动 (theblockbeats.info)** — required for China-facing crypto–macro and risk-asset transmission (BTC/ETH vs oil, Fed path, Asia risk-off); treat as tier 3 — verify hard macro prints against tier 1–2
- **财联社 (CLS, cls.cn)** — fastest A-share/policy flashes; **东方财富 (Eastmoney)** — quotes, turnover, sector flows
- **新华财经 (Xinhua Finance)** — official market wrap; **第一财经 (Yicai)** — PBOC OMO and policy detail
- **财新 (Caixin)**, **21世纪经济报道**, **证券时报**, **中国人民银行官网 (pbc.gov.cn)**, **国家外汇管理局 (safe.gov.cn)**, **中国证监会 (csrc.gov.cn)**, **国家统计局 (stats.gov.cn)**, **财政部 (mof.gov.cn)**

Reading official Chinese sources: announcements are often deliberately understated. Watch for signal phrases — 适度宽松 (moderately loose), 稳中求进 (progress amid stability), 逆周期调节 (counter-cyclical adjustment) — whose appearance/disappearance matters more than the surrounding prose.

**linshanova China minimum:** every daily China section should cite at least one item each from **华尔街见闻** and **BlockBeats** (or explicitly note if either had no coverage-window items).

## Market Data Quick Checks

For same-day levels and moves when articles don't state them:
- Indices/FX/commodities/yields: Yahoo Finance, Investing.com, CNBC quote pages
- China onshore: Eastmoney (东方财富), Sina Finance; CSI 300 = 000300.SS, ChiNext, Hang Seng = ^HSI
- US Treasury yields: treasury.gov daily yield curve; CNY fix: PBOC daily central parity announcement

## Economic Calendars

Check what was released or is scheduled today (helps interpret "why did the market move"):
- Investing.com economic calendar, ForexFactory calendar, TradingEconomics

## Coverage-Window Notes

- Chinese macro data typically releases at 09:30 or 10:00 Beijing time; PBOC operations announced ~09:00 Beijing.
- US data typically 08:30 or 10:00 ET; Fed decisions 14:00 ET.
- A "daily" sweep run in Asian morning hours should treat the prior US session as today's news.
