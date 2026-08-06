# Module source depth + theme-card site design

> Merged from:
> - locked module/source framework (2026-08-06 conversation)
> - `syravocado-网站改进建议.md`
> - `daily-financial-insights-source-integration-plan.md`
>
> Status: **design frame for approval** — do not implement until approved.

## Goal

Make syravocado a **smarter judgment site**: more sources, **less repetition**, deeper insight.

- Capture: Bloomberg + Glassnode + 华尔街见闻 + BlockBeats + ChainCatcher + CICC  
- Publish: **one event → one theme card** (full story once); other modules **reuse as different insights**, never paste the same wording  
- Fix today’s failure mode: the same story rewritten 5–7 times across Skim / Tape / Global / Assets / Signals / Watch  

---

## Design frame (approve this)

```text
┌──────────────────────────────────────────────────────────────┐
│ STATUS BAR                                                   │
│ as-of time · data口径 (上一收盘 / 今日亚洲 / 滚动24h) · freshness │
└──────────────────────────────────────────────────────────────┘

1  THEME CARDS ×3–5          ← ONLY place that fully expands a story
   fact · mechanism · trigger · invalidation · source drawer
   (absorbs today’s Skim + Signals + Watch narrative duplication)

2  COMPACT CLOSES            ← levels live here (full table foldable)
   optional later: 关键位/距离 tied to invalidators

3  PRIOR SCORECARD           ← holding / triggered / invalidated / faded

4  CLAIM DESK (观点台)        ← 中金 & institution views (L2)
   must attach: 印证主线 / 冲突主线 / 开新线

5  DETAIL SPINE
   Global  = Bloomberg email facts (+ grouped / fold)
   China   = Bloomberg email facts (+ 见闻 only for China resolution)
   Assets  = FILTER / reuse of theme cards (hold lens), not a 2nd news wire
   Crypto  = conditional tab if enough items; else under Assets

6  WATCH (forward only)
   A. Event calendar (dated)
   B. Ongoing risks / desk triggers (no re-telling theme cards)

7  SOURCES & METHOD (drawer / fold)
   coverage matrix · not pipeline logs
```

### One-line ownership rules

| Content | Belongs to |
|---------|------------|
| Prices / levels | Closes panel only |
| Final narrative of an event | **Theme card only** |
| “What Bloomberg said happened” list | Global / China spine |
| Portfolio hold lens | Assets (points at theme cards) |
| Multi-day theme mechanics | Inside theme card (signal fields) |
| Next dated check / forward trigger | Watch |
| Signed third-party view | CLAIM desk |
| Full URLs / multi-source evidence | Source drawer |

**Smart reuse:** same underlying fact may power theme + asset filter + Watch trigger + CLAIM link — **four wordings, one cluster**. Near-verbatim copy across modules is forbidden.

---

## Information layers (L1 / L2 / L3)

```text
L1 FACT       prices, official prints, hard news
              → multi-source = one fact + N source chips (cross-check)
              → 华尔街见闻 / BlockBeats / ChainCatcher primarily here

L2 CLAIM      signed third-party interpretation
              → 中金点睛 / Glassnode takes / desk color / sell-side
              → badge CLAIM · 第三方 (not FACT, not our JUDGMENT)

L3 JUDGMENT   our theme cards only
              → only place allowed to “tell the story”
```

Rule: **L1/L2 supply inputs; only L3 narrates.**

---

## Module × source map

| Module | Primary sources | Job |
|--------|-----------------|-----|
| **Global** | Bloomberg email | What changed (国际) — BBG spine |
| **China** | Bloomberg email (+ 见闻 for A-share/policy resolution) | What changed (大中华) — not a second global wire |
| **Theme cards** | All sources after cluster | Full insight once: fact → mechanism → trigger → invalidation |
| **Assets** | WS / BB / CC / CICC deepen the *read* | Hold lens over the same theme cards (filter, don’t rewrite) |
| **CLAIM desk** | CICC (theme-then-search); other institutions | Compact view + change vs prior + link to theme |
| **Watch** | BBG calendar + forward triggers from themes | Event calendar + ongoing risks / desk checks |
| **Tape / Closes / Figures** | BBG 市场一览 / closes inject / 今日图表 | Color · levels · one chart so-what |
| **Fund** | Unchanged separate RSS product | `/fund` |

### Source roles & daily quotas

| Source | Role | Must not | Daily budget |
|--------|------|----------|--------------|
| Bloomberg IMAP | Global/China/Tape/calendar spine | — | as today |
| Glassnode | BTC regime evidence / CLAIM-ish research | Paste same weekly blurb unchanged for days | weekly |
| 华尔街见闻 | China resolution + cross-check | Rebuild Global (60–70% BBG overlap) | ≤6 into pool |
| BlockBeats | Narrow crypto (BTC/ETF/MSTR/stables/exchanges/reg) | Alt spam, duplicate CC flashes | BB+CC ≤5 crypto themes |
| ChainCatcher RSS | Crypto incremental / depth | Duplicate BB price flashes | (shared crypto budget) |
| CICC | L2 research depth | Live news wire; dump into What changed | ≤2–3; theme-then-search only |

**CICC:** after today’s theme keys exist, search CICC; include only on incremental framework / changed view / verifiable assumption / portfolio-relevant conclusion. Public site: title + date + short paraphrase + link (`publication_mode`). No long reprint.

---

## Theme card (canonical unit)

```yaml
id: theme-oil-war-premium-2026-08-03
title: 油价战争溢价回吐
grade: STRONG | MODERATE | WEAK
assets: [Oil, Gold, US equities]    # filter tags — one card, many assets
fact: ...                           # once; multi-source chips
mechanism: ...                      # JUDGMENT
trigger: ...
invalidator: ...
horizon: 数日
status: new | continuing | escalated | retired
sources: [{label, href, contribution}]  # drawer
claims: [{institution, stance, vs_prior, relation}]  # 印证|冲突|开新线
```

UI: one card expands the story. Executive skim = **titles + anchors** into these cards (not a fifth rewrite). Assets tab filters the same cards by asset tag. Watch only keeps **forward** checks that point at a card.

---

## Dedupe (pipeline, not UI)

1. **Normalize** each capture → structured item (`source`, `entities`, `asset_tags`, `event_type`, `published_at`, `url`, …).  
2. **`event_key`** ≈ `(entity, action, value?, date window)` + title similarity fallback.  
3. **Domain merge first** (BB ↔ CC crypto), then global pool.  
4. **Priority of wording:** exchange/official > primary wire > 见闻 paraphrase; Glassnode > media for on-chain; CICC original > any paraphrase for views.  
5. **Incremental admit:** same event later only if new number / better primary / new mechanism / new claim / new trigger-invalidator. Else add source chip only.  
6. **Cross-day:** `first_seen` / `repeat_count` → demote to scorecard “延续”, don’t occupy today’s new slots.  
7. **Conflicts:** show both (“BB A vs CC B — awaiting primary”), don’t hide.

---

## Watch (forward only)

**A. Event calendar** — dated Bloomberg 日程/政策 (+ major known prints).  
**B. Ongoing risks / desk triggers** — undated multi-day checks; each line points at a theme card where possible.

Desks (optional labels on forward items): US/global equities · China/HK · Rates · FX · Commodities · Crypto.  
Cap ~2–3 forward items/desk. Not an RSS wall.

---

## Site UX fixes (bundled with redesign)

| Item | Change |
|------|--------|
| `#signals` / detail hash | `scrollIntoView` after tab select (bug) |
| Nav | Group “速览 / 深读”; don’t present 11 flat anchors |
| Source chrome | Superscript / small chips → drawer (kill 39× `SOURCE ·`) |
| As-of bar | One口径; relative labels (上一收盘 / 今日亚洲 / 滚动24h) |
| Freshness copy | “最近一期” or explicit “发布于 N 天前” when stale |
| Sources block | Reader-facing matrix; pipeline logs → Pipeline page |
| Language | Pick conclusion language (prefer **中文结论** + EN tickers); evidence may keep 原文 |
| CLAIM badge | FACT / CLAIM / JUDGMENT triad before CICC volume arrives |
| Crypto tab | Conditional if enough items; else Assets sub-block |
| Closes | Full board foldable; compact strip on skim |

---

## Capture pipeline (high level)

```text
fetch Bloomberg + Glassnode (existing IMAP)
fetch ChainCatcher RSS → inbox/chaincatcher/
sweep BlockBeats (narrow) → inbox/blockbeats/
sweep 华尔街见闻 (quota) → inbox/wallstreetcn/
form theme keys from BBG + closes
CICC theme-then-search → inbox/cicc/ (public-safe fields only)
cluster by event_key → theme candidates
generate briefing:
  themeCards[] + global/china (BBG) + claims[] + watch + closes/tape/figures
verify scan-links → PR
```

Fund RSS path unchanged.

---

## Phases

| Phase | Ship |
|-------|------|
| **P0** | `#detail` / Signals hash scroll fix; as-of / freshness copy clarity |
| **P1** | Theme-card content model + UI (merge narrative duplication); compact source drawer; generate prompt “one event one card” |
| **P2** | CLAIM badge + 观点台; CICC theme-then-search (public paraphrase only) |
| **P3** | ChainCatcher RSS + BlockBeats narrow sweep + crypto-domain merge |
| **P4** | Event-key clustering pipeline + cross-day demote |
| **P5** | 华尔街见闻 (after P4); China resolution quota |
| **P6** | Prior scorecard + archive theme tags; optional closes 关键位/距离 |

---

## Non-goals (this design)

- Four new source-named sections on the homepage  
- Cloning the full reference three-column archive site in P1  
- Pasting CICC / 见闻 VIP full text on the public site  
- Replacing Bloomberg Global/China spine with aggregator wires  
- Secrets in git  

---

## Success criteria

- One underlying story → one theme card full expansion; other modules show **different** insight angles or pointers.  
- Global/China remain Bloomberg-faithful lists (grouped/folded), not WS mirrors.  
- CICC appears as CLAIM attached to themes, not as “what changed”.  
- Watch is forward-only.  
- Adding sources does not lengthen the page with duplicate paragraphs.  
- CI accuracy gates remain fail-closed.

---

## Approval checkpoint

Please confirm or amend:

1. **Theme cards as the only full narrative** (Skim becomes titles+anchors)  
2. **CLAIM desk** for 中金 (印证 / 冲突 / 开新线)  
3. **Assets = filter over theme cards**, not a second news rewrite  
4. **Watch = calendar + forward risks only**  
5. **Phase order** P0→P6 (见闻 after dedupe; CICC before 见闻)

After approval → implementation plan starting at **P0 + P1**.
