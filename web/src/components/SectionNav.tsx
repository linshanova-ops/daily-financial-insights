import { L } from "./L";

interface SectionNavProps {
  hasFigures?: boolean;
  hasMarketOverview?: boolean;
  hasMarketDashboard?: boolean;
  hasThemes?: boolean;
  hasCalendar?: boolean;
}

export function SectionNav({
  hasFigures = false,
  hasMarketOverview = false,
  hasMarketDashboard = false,
  hasThemes = false,
  hasCalendar = false,
}: SectionNavProps) {
  const items = [
    { href: "#skim", en: "Summary", zh: "摘要" },
    ...(hasMarketDashboard
      ? [{ href: "#market-dashboard", en: "Closes", zh: "收盘" }]
      : []),
    ...(hasMarketOverview
      ? [{ href: "#market-overview", en: "Markets at a glance", zh: "市场一览" }]
      : []),
    ...(hasFigures ? [{ href: "#key-figures", en: "Figures", zh: "数据" }] : []),
    ...(hasThemes ? [{ href: "#themes", en: "Themes", zh: "主题" }] : []),
    ...(hasCalendar ? [{ href: "#calendar", en: "Calendar", zh: "日历" }] : []),
    { href: "#global-situation", en: "Global", zh: "全球" },
    { href: "#china-situation", en: "China", zh: "中国" },
    { href: "#sources", en: "Sources", zh: "来源" },
  ];

  return (
    <nav
      aria-label="Briefing sections"
      className="sticky top-0 z-20 border-b border-line/80 bg-mist/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 overflow-x-auto px-5 py-2 sm:px-8">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="focus-ring shrink-0 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-soft transition-colors hover:text-forest"
          >
            <L en={item.en} zh={item.zh} />
          </a>
        ))}
      </div>
    </nav>
  );
}
