# Stable Asset Framework (alpha/beta + regime lens)

A fixed lens for understanding each major asset, applied daily. Inspired by the
alpha/beta decomposition (资产收益 = 贝塔收益 + 阿尔法收益) and regime-based
asset pricing: most of a day's move is **beta to an identifiable macro driver**;
alpha claims need evidence. The framework's job is to say, per asset:

1. **Regime** — which macro force is the dominant beta *right now* (not in textbooks)?
2. **Driver** — today's reading of that force, with a number.
3. **Read** — what the asset did and whether it is consistent with the regime.
4. **Invalidator** — the observable that would say the regime flipped.

## Why regimes, not fixed rules

Textbook anchors break: e.g. gold's classic negative link to real yields weakened
after 2022 as central-bank buying and fiscal/credibility hedging became the
marginal driver (长江宏观, 西南证券 2026 strategy). The framework therefore
names the *current* dominant beta per asset and treats it as falsifiable, with an
explicit invalidator — same discipline as signals.

## Canonical asset set (cover these eight daily)

| Asset | Regime candidates (pick current) | Typical invalidator style |
|---|---|---|
| US equities (S&P/Nasdaq) | Fed path & real yields · earnings · liquidity/positioning | index vs level on rising/falling yields |
| US Treasuries (2y/10y) | inflation prints vs consensus · Fed communication · fiscal supply | yield range break with a catalyst |
| USD (DXY) | rate differentials · safe-haven flows · relative fiscal risk | DXY level vs rate spread move |
| Gold | real yields (classic) · central-bank buying/fiscal hedge (current) | behavior when real yields move |
| Oil (Brent/WTI) | geopolitics/supply risk · demand cycle · OPEC policy | price band with flow/vessel data |
| China equities (SHCOMP/CSI 300) | policy/liquidity stance · positioning snapback · global risk beta | index vs policy action calendar |
| CNY | PBOC fix signal · rate differentials · trade flows | fix vs model gap persistence |
| BTC | global liquidity/Fed path (high-beta risk) · idiosyncratic crypto flows | correlation break vs Nasdaq/rates |

## Output format (YAML frontmatter for the website)

```yaml
assetFramework:
  - asset: "Gold"
    regime: "Fiscal/credibility hedge — CB buying is the marginal driver, not real yields"
    driver: "COMEX settle $4,061 (+1.6%) with 10y -6bp post-CPI"
    read: "Bounced with yields down — classic beta today, but the 2022+ CB-buying floor caps downside"
    invalidator: "Gold falls >3% while real yields drop — would suggest hedge demand unwinding"
```

Rules:
- Every `driver` needs a number and a source in the day's log.
- `regime` must name a mechanism, not a mood ("Fed path via real yields", not "risk-off").
- If two regimes are fighting (e.g. CPI relief vs oil shock), say which won **today** and why.
- An asset with no regime-relevant news gets one line: regime unchanged, level, no new invalidator hits.
- Never present alpha (idiosyncratic) explanations when a beta explanation fits — beta first.
