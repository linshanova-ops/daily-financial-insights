import type { MarketDashboard as MarketDashboardData, MarketDashboardRow } from "@/lib/types";
import type { LangText } from "@/lib/lang-text";
import { assetZh, groupZh } from "@/lib/lang";
import { accents } from "@/lib/module-accents";
import { quoteKind, shanghaiQuote } from "@/lib/session-print";
import { L } from "./L";
import { Prose } from "./Prose";
import { SourceButton } from "./SourceButton";

interface MarketDashboardProps {
  data: MarketDashboardData;
}

function asOfLabel(iso: string, lang: "en" | "zh"): string {
  const formatted = new Date(iso).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return lang === "zh" ? `（${formatted}）` : ` (${formatted})`;
}

function changeClass(direction?: "up" | "down" | "flat"): string {
  if (direction === "up") return "text-forest";
  if (direction === "down") return "text-moderate";
  return "text-ink-soft";
}

function SessionMark({
  row,
  snapshot,
}: {
  row: MarketDashboardRow;
  snapshot?: string;
}) {
  const quote = snapshot ? shanghaiQuote(snapshot) : row.asOfDate;
  switch (quoteKind(row.id, row.asOfDate, snapshot)) {
    case "intraday":
      return <L en={`${quote} intraday`} zh={`${quote} 盘中`} />;
    case "yield":
      return <L en={`${row.asOfDate} official daily yield`} zh={`${row.asOfDate} 官方日度收益率`} />;
    case "24h":
      return <L en={`24h change to ${quote}`} zh={`截至 ${quote} 的24小时变动`} />;
    case "funding":
      return <L en={`${row.asOfDate} funding print`} zh={`${row.asOfDate} 资金费率结算`} />;
    default:
      return <L en={`${row.asOfDate} close`} zh={`${row.asOfDate} 收盘`} />;
  }
}

function Contract({ month }: { month?: string }) {
  const m = month && /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const en = new Date(Date.UTC(+m[1], +m[2] - 1, 15)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <span className="block text-xs font-normal text-ink-soft">
      <L en={`${en} contract`} zh={`${m[1]}年${+m[2]}月合约`} />
    </span>
  );
}

function PrintNote({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <p className="mt-1 text-xs font-normal leading-snug text-ink-soft">
      <Prose text={note as LangText} />
    </p>
  );
}

export function MarketDashboard({ data }: MarketDashboardProps) {
  const accent = accents.copper;
  const groups = data.groups?.filter((g) => g.rows?.length) ?? [];
  if (!groups.length) return null;

  return (
    <section
      id="market-dashboard"
      className="scroll-mt-40 section-band border-y border-line/70 bg-paper/55"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            className={`h-6 w-1 rounded-full ${accent.headerBar}`}
            aria-hidden
          />
          <p
            className={`text-xs font-semibold uppercase tracking-[0.24em] ${accent.eyebrow}`}
          >
            <L en="Market Dashboard" zh="市场看板" />
          </p>
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          <L en="Market snapshot" zh="行情快照" />
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          <L
            en={`Snapshot as of generate time${data.asOf ? asOfLabel(data.asOf, "en") : ""}. Not live-updating on this page.`}
            zh={`生成时的快照${data.asOf ? asOfLabel(data.asOf, "zh") : ""}。本页不实时更新。`}
          />
        </p>

        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
                <L en={group.title} zh={groupZh(group.id, group.title)} />
              </h3>
              <ul className="mt-3 divide-y divide-line/70 border-y border-line/70 sm:hidden">
                {group.rows.map((row) => (
                  <li key={row.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 font-medium text-ink">
                        <L en={row.asset} zh={assetZh(row.id, row.asset)} />
                        <Contract month={row.contract} />
                      </span>
                      <span className="shrink-0 tabular-nums text-ink">{row.latest}</span>
                    </div>
                    <PrintNote note={row.printNote} />
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className={`tabular-nums font-semibold ${changeClass(row.changeDirection)}`}>
                        {row.change ?? "—"}
                      </span>
                      <span className="text-ink-soft">
                        <SessionMark row={row} snapshot={data.asOf} />
                      </span>
                      <SourceButton sources={[row.source]} />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[36rem] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[26%]" />
                    <col />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-ink/45">
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Asset" zh="资产" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Latest" zh="最新" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Change" zh="变动" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Time · quote type" zh="时点 · 报价类型" />
                      </th>
                      <th className="py-2 font-semibold">
                        <L en="Source" zh="来源" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-line/60 last:border-0"
                      >
                        <td className="py-2.5 pr-3 font-medium text-ink">
                          <L en={row.asset} zh={assetZh(row.id, row.asset)} />
                          <Contract month={row.contract} />
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink">
                          <span className="whitespace-nowrap">{row.latest}</span>
                          <PrintNote note={row.printNote} />
                        </td>
                        <td
                          className={`py-2.5 pr-3 whitespace-nowrap tabular-nums font-semibold ${changeClass(row.changeDirection)}`}
                        >
                          {row.change ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                          <SessionMark row={row} snapshot={data.asOf} />
                        </td>
                        <td className="py-2.5">
                          <SourceButton sources={[row.source]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {data.note ? (
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink/50">
            <Prose text={data.note} />
          </p>
        ) : null}
      </div>
    </section>
  );
}
