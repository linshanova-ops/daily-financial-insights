# Market Dashboard design

## Goal

Add a **Market Dashboard** module to syravocado that ports the reference site’s **MARKET CLOSES / 今日市场看板** tape table: grouped assets with latest level, day change, as-of date, and source.

## Decisions (approved)

| Choice | Decision |
|--------|----------|
| Scope | Keep existing **Key figures** and add Market Dashboard (**both**) |
| Placement | Directly under hero, **above** Key figures |
| Data path | Fetch at twice-daily generate time; persist into briefing frontmatter/JSON; site reads published snapshot (no visitor-side live APIs) |
| Asset list | Full reference set |
| API keys | **Free sources first** — no paid keys required to ship |

## Data model

Optional frontmatter field on each briefing:

```yaml
marketDashboard:
  asOf: "2026-07-18T08:00:00.000Z"   # when snapshot was fetched (UTC)
  note: "Equities/FX/commodities: last two complete sessions where available; Treasuries: official curve; BTC: 24h; funding: adjacent prints."
  groups:
    - id: global-equities
      title: Global equities
      rows:
        - id: spx
          asset: S&P 500
          latest: "7,533.77"
          change: "−0.51%"
          changeDirection: down   # up | down | flat
          asOfDate: "2026-07-16"
          source:
            label: Yahoo Finance (^GSPC)
            href: https://finance.yahoo.com/quote/%5EGSPC/
```

Groups (fixed order):

1. Global equities — S&P 500, Nasdaq, VIX, Nikkei 225, Hang Seng, Hang Seng Tech, Shanghai Composite  
2. US Treasuries — 2Y / 5Y / 10Y / 30Y  
3. FX / Commodities / Crypto — USD/JPY, USD/CNY, Gold, Brent, BTC/USD, BTC funding rate  

## Fetch sources (no key)

| Row | Source |
|-----|--------|
| Equity indices, HSTECH, Brent, FX, gold futures | Yahoo Finance chart API |
| US Treasury yields | U.S. Treasury daily rates (public) |
| BTC level + 24h % | CoinGecko public API |
| BTC funding | OKX public API |

If a single row fails, **omit that row** and continue (module still publishes). Do not invent levels.

## UI

- New section `#market-dashboard`, eyebrow **Market Dashboard**, copper accent (distinct from Key figures / Assets).  
- Grouped table: Asset · Latest · Day chg · Date · Source (source as existing `SourceButton` / link).  
- Change column tinted up/down.  
- SectionNav link **Markets** when `marketDashboard` present.  
- Older briefings without the field: section hidden (no empty module).

## Publish integration

1. `web/scripts/fetch-market-closes.mjs` fetches snapshot; `--inject path/to/YYYY-MM-DD.md` merges into frontmatter.  
2. Generate-agent prompt: after drafting the md, run inject + `sync-data` + `scan-links`.  
3. `sync-briefing-data.mjs` already copies all frontmatter — no special-case needed.

## Out of scope

- Client-side live refresh  
- Paid Twelve Data / EODHD keys  
- Porting other reference-site sections (core summary, calendar, etc.)
