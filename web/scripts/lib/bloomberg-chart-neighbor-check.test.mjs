import assert from "node:assert/strict";
import { it } from "node:test";
import { checkEmptyChartNotNeighbor } from "./bloomberg-chart-neighbor-check.mjs";

const mail = [
  "国际要闻",
  "* 世界大型企业联合会公布美国9月消费者信心指数跌至十二年最低。8月职位空缺数降至五个月低位，但裁员人数依然较少",
  "* 波音赢得海军订单",
  "",
  "今日图表",
  "",
  "大中华新闻",
  "* 中国将自10月1日起对首次购房者实施房贷贴息",
].join("\n");

it("rejects an empty 今日图表 write-up copied from the neighboring section", () => {
  const copied = checkEmptyChartNotNeighbor(
    mail,
    "今日图表是世界大型企业联合会消费者信心指数跌至十二年最低，职位空缺降至五个月低位",
  );
  assert.equal(copied.ok, false);
  const fromPng = checkEmptyChartNotNeighbor(
    mail,
    "今日图表标题是大豆居美国对华农产品出口之首。图例是农产品出口总额、大豆、棉花、小麦和玉米。来源是美国农业部海外农业局。",
  );
  assert.equal(fromPng.ok, true);
});
