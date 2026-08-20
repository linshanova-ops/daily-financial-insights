# Stable Asset Framework (alpha/beta + regime lens)

A fixed lens for understanding each major asset class, applied daily. Inspired by the
alpha/beta decomposition (资产收益 = 贝塔收益 + 阿尔法收益) and regime-based
asset pricing: most of a day's move is **beta to an identifiable macro driver**;
alpha claims need evidence.

The website does **not** render `assetClasses[]` (or legacy `assetFramework[]`). Do not spend a publish run filling six books. This note is only if you still author the YAML for archives.

## Class order (fixed)

| Class id | Title | Instrument examples |
|---|---|---|
| `us-equities` | US equities | S&P / Nasdaq |
| `asia-equities` | Asia equities | Golden Dragon / HK-linked; Japan/Korea (Nikkei, Kospi) |
| `rates` | Rates | UST 2y/10y; China rates only if sourced |
| `fx` | FX | USD (DXY), USD/JPY, USD/CNY — **rows under FX, never top-level peers** |
| `commodities` | Commodities | Oil (Brent/WTI), Gold |
| `crypto` | Crypto | BTC |

Per class: one **regime** line (current beta); 1–3 **instruments** with driver (sourced print or labeled CLAIM), **read** (the valuable view), optional invalidator, optional `themeId` chip. This tab is the book-by-book judgment — not a second news wire and not a pointer at Market Dashboard.

## Why regimes, not fixed rules

Textbook anchors break: e.g. gold's classic negative link to real yields weakened
after 2022 as central-bank buying and fiscal/credibility hedging became the
marginal driver. Name the *current* dominant beta and treat it as falsifiable.

## Output format (YAML)

```yaml
assetClasses:
  - id: commodities
    title: Commodities
    regime: "Diplomacy-led oil war-premium unwind"
    instruments:
      - name: Oil (Brent / WTI)
        driver: "WTI third down day on Hormuz deal signs"
        driverSources:
          - label: 彭博 Markets Daily China / 财经早茶
            href: "https://www.bloomberg.com/asia"
        read: "Oil remains headline-first until corridor verified"
        invalidator: "Failed talks with Brent reclaiming war-premium highs"
        themeId: hormuz-temp-corridor
```

Rules:
- Every `driver` needs a sourced print or labeled CLAIM/desk — never “see Market Dashboard” as the whole story. Levels live in `marketDashboard`.
- `driverSources` = that instrument’s primary (plus estimate source if the sentence names a beat/miss). Do not clone the day’s `keySources` list onto every row.
- `regime` names a mechanism, not a mood.
- `read` is the perspective: what the print means for that book, and the next falsifier.
- Quiet class: one honest line — don’t pad, don’t hide behind the dashboard.
- Chip `themeId` to **today’s** Themes. Rewrite `themeCards` from today’s 今日图表 + 市场一览 + 国际要闻/大中华; do not keep yesterday’s Theme titles because the chips already exist.
- Never present USD / JPY / CNY as peer top-level assets beside Oil or Equities.
