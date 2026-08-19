/**
 * bloomberg-chart-of-day PNG must be today's capture, or omitted.
 */
export function checkBloombergChartDate(briefing) {
  const fig = (briefing.figures || []).find(
    (f) => f?.id === "bloomberg-chart-of-day",
  );
  if (!fig) return { ok: true };
  const src = String(fig.imageSrc || "");
  const date = String(briefing.date || "");
  if (date && src.includes(date)) return { ok: true };
  return {
    ok: false,
    message:
      `bloomberg-chart-of-day ${src || "(missing imageSrc)"} is not ${date}; ` +
      "omit the figure rather than reuse yesterday’s PNG as 今日图表",
  };
}
