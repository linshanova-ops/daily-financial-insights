# Stable Asset Framework (alpha/beta + regime lens)

A fixed lens for understanding each major asset class, applied daily. Inspired by the
alpha/beta decomposition (资产收益 = 贝塔收益 + 阿尔法收益) and regime-based
asset pricing: most of a day's move is **beta to an identifiable macro driver**;
alpha claims need evidence.

Website schema: `assetClasses[]` (see `docs/superpowers/specs/2026-08-06-event-calendar-design.md`).
Legacy flat `assetFramework[]` remains for older briefings only.

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
- `regime` names a mechanism, not a mood.
- `read` is the perspective: what the print means for that book, and the next falsifier.
- Quiet class: one honest line — don’t pad, don’t hide behind the dashboard.
- Prefer `themeId` chips over rewriting Themes.
- Never present USD / JPY / CNY as peer top-level assets beside Oil or Equities.
