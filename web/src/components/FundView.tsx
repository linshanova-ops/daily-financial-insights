"use client";

import { useMemo, useState } from "react";
import type { FundBundle, FundUniverseItem } from "@/lib/fund";

type TabId = "feed" | "funds" | "rules";

const tabs: { id: TabId; label: string; en: string }[] = [
  { id: "feed", label: "动态", en: "Feed" },
  { id: "funds", label: "监控基金", en: "Universe" },
  { id: "rules", label: "校验规则", en: "Rules" },
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
        !q || `${f.name} ${f.country} ${f.city}`.toLowerCase().includes(q);
      const matchesStrategy = strategy === "全部策略" || f.strategy === strategy;
      return matchesQuery && matchesStrategy;
    });
  }, [data.monitored, query, strategy]);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-forest" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
          Fund
        </p>
      </div>
      <h1 className="display mt-3 max-w-3xl text-4xl tracking-tight text-ink sm:text-5xl">
        {data.meta.title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
        {data.meta.subtitle}
      </p>
      <p className="mt-3 text-xs tracking-wide text-ink/45">
        {data.meta.scanWindow}
        <span className="mx-2 text-line">·</span>
        同步 {data.meta.updatedAtLabel} {data.meta.timezone}
        <span className="mx-2 text-line">·</span>
        信源 {data.meta.sourcesChecked}
      </p>
      {data.meta.lastScan ? (
        <p className="mt-1.5 text-xs tracking-wide text-ink/40">
          上次扫描 · 抓取 {data.meta.lastScan.fetched} · 新增{" "}
          {data.meta.lastScan.newConfirmed} · 待复核 {data.meta.lastScan.review}
        </p>
      ) : null}

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
              className={`focus-ring shrink-0 px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors sm:text-sm ${
                selected
                  ? "border-b-2 border-forest text-forest"
                  : "text-ink-soft hover:text-forest"
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.en}
              <span className="ml-1.5 font-normal text-ink/40">{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "feed" ? (
        <FeedTab
          data={data}
          reviewOpen={reviewOpen}
          setReviewOpen={setReviewOpen}
        />
      ) : null}
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
      {tab === "rules" ? <RulesTab rules={data.rules} /> : null}
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
    { label: "Confirmed", zh: "确定命中", value: String(data.signals.length) },
    { label: "Review", zh: "待复核", value: String(data.review.length) },
    { label: "Monitored", zh: "监控基金", value: String(data.monitored.length) },
    { label: "Sources", zh: "信源", value: data.meta.sourcesChecked },
  ];

  return (
    <div className="mt-10 space-y-12">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-6 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="display text-3xl tracking-tight text-ink">{m.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
              {m.label}
            </p>
            <p className="text-xs text-ink-soft">{m.zh}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-forest" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
            Confirmed · 确定命中
          </p>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          永久归档 · {data.signals.length} 条
        </p>
        <ol className="mt-6">
          {data.signals.map((sig, index) => (
            <li
              key={sig.id}
              className="grid gap-2 border-t border-line py-5 md:grid-cols-[3.5rem_6.5rem_1fr] md:gap-5"
            >
              <div className="display text-xl text-forest/50">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="text-sm text-ink/55">
                <p>{sig.date}</p>
              </div>
              <div>
                <h3 className="text-base font-semibold leading-snug text-ink sm:text-lg">
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
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {sig.summary}
                </p>
                {sig.summaryEn ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink/50">
                    {sig.summaryEn}
                  </p>
                ) : null}
                <p className="mt-2 text-xs tracking-wide text-ink/45">
                  <span className="text-forest">{sig.fund}</span>
                  <span className="mx-2">·</span>
                  {sig.source}
                  <span className="mx-2">·</span>
                  {sig.tag}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-line pt-4">
        <button
          type="button"
          className="focus-ring flex w-full items-baseline justify-between py-2 text-left"
          aria-expanded={reviewOpen}
          onClick={() => setReviewOpen(!reviewOpen)}
        >
          <span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
              Review · 待复核
            </span>
            <span className="ml-2 text-sm text-ink-soft">{data.review.length}</span>
          </span>
          <span className="text-xs text-ink/45">{reviewOpen ? "收起" : "展开"}</span>
        </button>
        {reviewOpen ? (
          <ul>
            {data.review.map((item) => (
              <li key={item.id} className="border-t border-line/70 py-4">
                <p className="font-medium text-ink">
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring transition-colors hover:text-forest"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {item.reason}
                </p>
                <p className="mt-1 text-xs text-copper">置信度 {item.confidence}</p>
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
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-azure" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-azure">
          Universe · 监控基金
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        当前监控 {total} 家管理机构（2026 AUM 选型）。
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fund / city"
          className="focus-ring w-full border-b border-line bg-transparent px-0 py-2 text-sm text-ink outline-none sm:max-w-xs"
        />
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="focus-ring border-b border-line bg-transparent py-2 text-sm text-ink outline-none"
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
            <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-ink/40">
              <th className="py-3 pr-3 font-semibold">#</th>
              <th className="py-3 pr-3 font-semibold">Firm</th>
              <th className="py-3 pr-3 font-semibold">Strategy</th>
              <th className="py-3 pr-3 font-semibold">Location</th>
              <th className="py-3 font-semibold">AUM</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((f) => (
              <tr key={f.rank} className="border-b border-line/60">
                <td className="py-3 pr-3 text-ink/45">{f.rank}</td>
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
          <p className="mt-6 text-sm text-ink-soft">No matching funds.</p>
        ) : null}
      </div>
    </div>
  );
}

function RulesTab({ rules }: { rules: FundBundle["rules"] }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-forest" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-forest">
          Rules · 校验规则
        </p>
      </div>
      <ul className="mt-8 space-y-0">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="grid gap-2 border-t border-line py-6 md:grid-cols-[10rem_1fr] md:gap-10"
          >
            <h3 className="display text-xl tracking-tight text-ink">{rule.title}</h3>
            <p className="text-base leading-relaxed text-ink-soft">{rule.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
