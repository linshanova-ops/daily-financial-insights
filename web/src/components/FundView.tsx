"use client";

import { useMemo, useState } from "react";
import type {
  FundBundle,
  FundUniverseItem,
} from "@/lib/fund";

type TabId = "feed" | "funds" | "rules";

const tabs: { id: TabId; label: string }[] = [
  { id: "feed", label: "动态" },
  { id: "funds", label: "监控基金" },
  { id: "rules", label: "校验规则" },
];

function formatAum(aum: number): string {
  return `$${aum.toFixed(1)}B`;
}

export function FundView({ data }: { data: FundBundle }) {
  const [tab, setTab] = useState<TabId>("feed");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState("全部策略");

  const strategies = useMemo(() => {
    const set = new Set(data.monitored.map((f) => f.strategy));
    return ["全部策略", ...Array.from(set).sort()];
  }, [data.monitored]);

  const filteredFunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.monitored.filter((f) => {
      const matchesQuery =
        !q ||
        `${f.name} ${f.country} ${f.city}`.toLowerCase().includes(q);
      const matchesStrategy = strategy === "全部策略" || f.strategy === strategy;
      return matchesQuery && matchesStrategy;
    });
  }, [data.monitored, query, strategy]);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        {data.meta.scanWindow}
      </p>
      <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="display text-4xl tracking-tight text-ink sm:text-6xl">
            {data.meta.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {data.meta.subtitle}
          </p>
        </div>
        <div className="shrink-0 text-sm text-ink-soft lg:text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
            最后同步
          </p>
          <p className="mt-1 font-semibold text-ink">{data.meta.updatedAtLabel}</p>
          <p className="text-xs text-ink/45">{data.meta.timezone}</p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Fund modules"
        className="mt-10 flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`focus-ring shrink-0 px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
                selected
                  ? "border-b-2 border-forest text-forest"
                  : "text-ink-soft hover:text-forest"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "feed" ? <FeedTab data={data} reviewOpen={reviewOpen} setReviewOpen={setReviewOpen} /> : null}
      {tab === "funds" ? (
        <FundsTab
          funds={filteredFunds}
          total={data.monitored.length}
          query={query}
          setQuery={setQuery}
          strategy={strategy}
          setStrategy={setStrategy}
          strategies={strategies}
        />
      ) : null}
      {tab === "rules" ? <RulesTab rules={data.rules} phaseNote={data.meta.phaseNote} /> : null}
    </section>
  );
}

function FeedTab({
  data,
  reviewOpen,
  setReviewOpen,
}: {
  data: FundBundle;
  reviewOpen: boolean;
  setReviewOpen: (v: boolean) => void;
}) {
  const metrics = [
    {
      label: "确定命中",
      value: String(data.signals.length),
      hint: "累计保留，不做删除",
      accent: "text-forest",
    },
    {
      label: "待复核 / 已排除",
      value: String(data.review.length),
      hint: "弱匹配单独陈列",
      accent: "text-copper",
    },
    {
      label: "监控基金",
      value: String(data.monitored.length),
      hint: "2026 AUM Top 100 选型",
      accent: "text-ink",
    },
    {
      label: "信源已检查",
      value: data.meta.sourcesChecked,
      hint: data.meta.sourcesNote,
      accent: "text-ink",
    },
  ];

  return (
    <div className="mt-10 space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="border-t border-line pt-4">
            <p className={`display text-3xl tracking-tight ${m.accent}`}>{m.value}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{m.label}</p>
            <p className="mt-1 text-xs text-ink/45">{m.hint}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
          Confirmed signals
        </p>
        <h2 className="display mt-2 text-3xl tracking-tight text-ink">确定命中</h2>
        <p className="mt-1 text-sm text-ink-soft">
          永久归档 · 按时间倒序 · {data.signals.length} 条
        </p>
        <ol className="mt-8 space-y-0">
          {data.signals.map((sig, index) => (
            <li
              key={sig.id}
              className="grid gap-3 border-t border-line py-6 md:grid-cols-[4rem_7rem_1fr] md:gap-6"
            >
              <div className="display text-2xl text-forest/60">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="text-sm text-ink-soft">
                <p className="font-medium text-ink">{sig.date}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-forest">
                  已确认
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-snug text-ink">
                  {sig.href ? (
                    <a
                      href={sig.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring transition-colors hover:text-forest"
                    >
                      {sig.title}
                    </a>
                  ) : (
                    sig.title
                  )}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">
                  {sig.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-ink/55">
                  <span className="bg-forest/10 px-2 py-1 text-forest">{sig.fund}</span>
                  <span className="px-2 py-1">{sig.source}</span>
                  <span className="px-2 py-1">{sig.tag}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="border border-line/80 bg-mist/40">
        <button
          type="button"
          className="focus-ring flex w-full items-center justify-between px-4 py-4 text-left sm:px-5"
          aria-expanded={reviewOpen}
          onClick={() => setReviewOpen(!reviewOpen)}
        >
          <span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
              Review queue
            </span>
            <span className="mt-1 block text-base font-semibold text-ink">
              已排除 / 低置信度{" "}
              <span className="text-copper">{data.review.length}</span>
            </span>
          </span>
          <span className="text-sm text-ink-soft">{reviewOpen ? "收起" : "展开"}</span>
        </button>
        {reviewOpen ? (
          <ul className="space-y-0 border-t border-line px-4 pb-4 sm:px-5">
            {data.review.map((item) => (
              <li key={item.id} className="border-t border-line/70 py-4">
                <p className="font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {item.reason}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-copper">
                  置信度 {item.confidence}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function FundsTab({
  funds,
  total,
  query,
  setQuery,
  strategy,
  setStrategy,
  strategies,
}: {
  funds: FundUniverseItem[];
  total: number;
  query: string;
  setQuery: (v: string) => void;
  strategy: string;
  setStrategy: (v: string) => void;
  strategies: string[];
}) {
  return (
    <div className="mt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure">
        2026 Hedge fund AUM ranking
      </p>
      <h2 className="display mt-2 text-3xl tracking-tight text-ink">监控基金</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        当前监控 {total} 家（来自 `monitored.json`）。按 2026 年管理规模筛选全球前
        100 家对冲基金管理机构。
      </p>
      <p className="mt-3 max-w-2xl border-l-2 border-copper/40 bg-copper/5 px-3 py-2 text-xs leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Admin add/remove:</span> edit{" "}
        <code className="text-forest">web/content/fund/monitored.json</code> then
        commit / deploy. Visitors cannot change the selection.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索基金 / 城市 / 国家"
          className="focus-ring w-full border border-line bg-paper px-3 py-2 text-sm text-ink sm:max-w-xs"
        />
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="focus-ring border border-line bg-paper px-3 py-2 text-sm text-ink"
        >
          {strategies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-[40rem] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-ink/45">
              <th className="py-3 pr-3 font-semibold">#</th>
              <th className="py-3 pr-3 font-semibold">机构</th>
              <th className="py-3 pr-3 font-semibold">策略</th>
              <th className="py-3 pr-3 font-semibold">所在地</th>
              <th className="py-3 font-semibold">AUM</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.rank} className="border-b border-line/70">
                <td className="py-3 pr-3 text-ink/55">{f.rank}</td>
                <td className="py-3 pr-3 font-medium text-ink">
                  {f.name}
                  {f.change && f.change !== "—" ? (
                    <span className="ml-2 text-xs text-copper">{f.change}</span>
                  ) : null}
                </td>
                <td className="py-3 pr-3 text-ink-soft">{f.strategy}</td>
                <td className="py-3 pr-3 text-ink-soft">
                  {f.city}, {f.country}
                </td>
                <td className="py-3 font-medium text-ink">{formatAum(f.aum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {funds.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">没有匹配的监控基金。</p>
        ) : null}
      </div>
    </div>
  );
}

function RulesTab({
  rules,
  phaseNote,
}: {
  rules: FundBundle["rules"];
  phaseNote: string;
}) {
  return (
    <div className="mt-10">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
        Validation
      </p>
      <h2 className="display mt-2 text-3xl tracking-tight text-ink">校验规则</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        {phaseNote}
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {rules.map((rule) => (
          <li key={rule.id} className="border-t border-line pt-5">
            <h3 className="display text-2xl tracking-tight text-ink">{rule.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">{rule.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
