import type { MarketDashboard as MarketDashboardData, MarketDashboardRow } from "@/lib/types";
import type { LangText } from "@/lib/lang-text";
import { assetZh, groupZh } from "@/lib/lang";
import { accents } from "@/lib/module-accents";
import { quoteKind, shanghaiQuote } from "@/lib/session-print";
import { L } from "./L";
import { Prose } from "./Prose";

interface MarketDashboardProps {
  data: MarketDashboardData;
}

function asOfLabel(iso: string, lang: "en" | "zh"): string {
  const formatted = new Date(iso).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
    timeZoneName: "short",
  });
  return lang === "zh" ? `（${formatted}）` : ` (${formatted})`;
}

function changeClass(direction?: "up" | "down" | "flat"): string {
  if (direction === "up") return "text-forest";
  if (direction === "down") return "text-moderate";
  return "text-ink-soft";
}

const TAG = {
  close: ["close", "收盘"],
  yield: ["official yield", "官方收益率"],
  "24h": ["24h", "24小时"],
  funding: ["funding", "资金费率"],
} as const;

/**
 * Print date + quote type. Closes, yields and funding use the row's market-local bar date;
 * intraday and 24h quotes use the snapshot's Beijing date, matching the Beijing clock shown.
 */
function QuoteTag({ row, snapshot }: { row: MarketDashboardRow; snapshot?: string }) {
  const kind = quoteKind(row.id, row.asOfDate, snapshot);
  const [bjDate, hhmm] = snapshot ? shanghaiQuote(snapshot).split(" ") : [row.asOfDate, ""];
  const live = kind === "intraday" || kind === "24h";
  const [, m, d] = (live ? bjDate : row.asOfDate).split("-").map(Number);
  const en = `${new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} `;
  const zh = `${m}月${d}日 `;
  if (kind === "intraday") return <L en={`${en}intraday ${hhmm}`} zh={`${zh}盘中 ${hhmm}`} />;
  return <L en={en + TAG[kind][0]} zh={zh + TAG[kind][1]} />;
}

function AssetName({ row, note }: { row: MarketDashboardRow; note?: number }) {
  const m = row.contract && /^(\d{4})-(\d{2})$/.exec(row.contract);
  const en = m && new Date(Date.UTC(+m[1], +m[2] - 1, 15)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <L en={row.asset} zh={assetZh(row.id, row.asset)} />
      {m ? <span className="font-normal text-ink-soft"> · <L en={en} zh={`${m[1]}年${+m[2]}月`} /></span> : null}
      {note ? (
        <sup className="ml-0.5">
          <a href={`#snapshot-note-${note}`} className="focus-ring text-forest">{note}</a>
        </sup>
      ) : null}
    </>
  );
}

export function MarketDashboard({ data }: MarketDashboardProps) {
  const accent = accents.copper;
  const groups = data.groups?.filter((g) => g.rows?.length) ?? [];
  if (!groups.length) return null;
  const rows = groups.flatMap((g) => g.rows);
  const noted = rows.filter((r) => r.printNote);
  const noteNo = (row: MarketDashboardRow) => noted.indexOf(row) + 1 || undefined;

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
                        <AssetName row={row} note={noteNo(row)} />
                      </span>
                      <span className="shrink-0 tabular-nums text-ink">{row.latest}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className={`tabular-nums font-semibold ${changeClass(row.changeDirection)}`}>
                        {row.change ?? "—"}
                      </span>
                      <span className="text-ink-soft">
                        <QuoteTag row={row} snapshot={data.asOf} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[36rem] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col className="w-[18%]" />
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
                        <L en="Quote" zh="报价类型" />
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
                          <AssetName row={row} note={noteNo(row)} />
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums text-ink">
                          {row.latest}
                        </td>
                        <td
                          className={`py-2.5 pr-3 whitespace-nowrap tabular-nums font-semibold ${changeClass(row.changeDirection)}`}
                        >
                          {row.change ?? "—"}
                        </td>
                        <td className="py-2.5 whitespace-nowrap text-ink-soft">
                          <QuoteTag row={row} snapshot={data.asOf} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {noted.length ? (
          <div className="mt-8 max-w-3xl border-t border-line/70 pt-5 text-base leading-relaxed text-ink-soft">
            <ol className="space-y-2">
              {noted.map((row, i) => (
                <li key={row.id} id={`snapshot-note-${i + 1}`} className="scroll-mt-40">
                  <sup className="mr-1 text-forest">{i + 1}</sup>
                  <span className="font-medium text-ink"><L en={row.asset} zh={assetZh(row.id, row.asset)} /><L en=": " zh="：" /></span>
                  <Prose text={row.printNote as LangText} />
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
