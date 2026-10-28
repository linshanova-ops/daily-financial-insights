import { L } from "@/components/L";

export const metadata = {
  title: "Pipeline",
};

export default function PipelinePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        <L en="How a briefing is made" zh="简报的生成" />
      </p>
      <h1 className="display mt-3 max-w-3xl text-4xl tracking-tight text-ink sm:text-6xl">
        <L en="Inbox, primary sources, then a short note" zh="收件箱与原始来源，随后为短篇解读" />
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        <L
          en="Weekdays at 09:00 China time the site publishes that morning’s 彭博 财经早茶 plus dated primary prints (Treasury, Fed, AP closes, PBOC/NBS, 华尔街见闻 / 财新 / 第一财经). The page shows the sourced tape and a few themes — not a six-book asset matrix and not a live feed."
          zh="每个工作日北京时间 09:00，本站发布当日早晨的彭博财经早茶，以及注明日期的原始数据（美国国债、美联储、美联社收盘、央行与统计局、华尔街见闻 / 财新 / 第一财经）。页面呈现有来源的行情和少数主题，不是六大类资产矩阵，也不是实时行情。"
        />
      </p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
        <L
          en="Accuracy: every hard number needs a dated source in the coverage window. A shorter accurate briefing beats a wrong figure. Before deploy, an automated scan checks that cited pages support the claimed numbers."
          zh="准确性：每个硬数字都要在覆盖区间内有一个注明日期的来源。短而准的简报好过一个错的数字。部署前，自动扫描会核对被引用的页面是否支撑所写的数字。"
        />
      </p>
    </section>
  );
}
