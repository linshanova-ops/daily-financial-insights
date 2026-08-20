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
    { href: "#skim", label: "Summary" },
    ...(hasThemes ? [{ href: "#themes", label: "Themes" }] : []),
    ...(hasMarketDashboard
      ? [{ href: "#market-dashboard", label: "Closes" }]
      : []),
    ...(hasMarketOverview
      ? [{ href: "#market-overview", label: "Books" }]
      : []),
    ...(hasFigures ? [{ href: "#key-figures", label: "Figures" }] : []),
    ...(hasCalendar ? [{ href: "#calendar", label: "Calendar" }] : []),
    { href: "#global-situation", label: "国际要闻" },
    { href: "#china-situation", label: "大中华" },
    { href: "#sources", label: "Sources" },
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
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
