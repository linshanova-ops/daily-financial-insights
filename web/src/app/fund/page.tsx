import { FundView } from "@/components/FundView";
import { loadFundBundle } from "@/lib/fund";

export const metadata = {
  title: "Fund",
  description:
    "对冲基金信息监控 — AUM Top 100 监控选型、确定命中与校验规则（syravocado Fund module）。",
};

export default function FundPage() {
  const data = loadFundBundle();
  return <FundView data={data} />;
}
