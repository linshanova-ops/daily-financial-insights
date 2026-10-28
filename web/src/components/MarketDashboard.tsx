import type { MarketDashboard as MarketDashboardData } from "@/lib/types";
import { assetZh, groupZh } from "@/lib/lang";
import { accents } from "@/lib/module-accents";
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

export function MarketDashboard({ data }: MarketDashboardProps) {
  const accent = accents.copper;
  const groups = data.groups?.filter((g) => g.rows?.length) ?? [];
  if (!groups.length) return null;

  return (
    <section
      id="market-dashboard"
      className="scroll-mt-24 section-band border-y border-line/70 bg-paper/55"
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
          <L en="Market closes" zh="市场收盘" />
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          <L
            en={`Snapshot as of generate time${data.asOf ? asOfLabel(data.asOf, "en") : ""}. Not live-updating on this page.`}
            zh={`生成时点的快照${data.asOf ? asOfLabel(data.asOf, "zh") : ""}。本页不实时更新。`}
          />
        </p>

        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/55">
                <L en={group.title} zh={groupZh(group.id, group.title)} />
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-ink/45">
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Asset" zh="资产" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Latest" zh="最新" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Day chg" zh="日变动" />
                      </th>
                      <th className="py-2 pr-3 font-semibold">
                        <L en="Date" zh="日期" />
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
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink">
                          {row.latest}
                        </td>
                        <td
                          className={`py-2.5 pr-3 tabular-nums font-semibold ${changeClass(row.changeDirection)}`}
                        >
                          {row.change ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-ink-soft">
                          {row.asOfDate}
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
