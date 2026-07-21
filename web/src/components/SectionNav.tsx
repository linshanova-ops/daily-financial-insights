"use client";

import { DETAIL_TABS } from "@/lib/detail-tabs";

const primary = [
  { href: "#skim", label: "Skim" },
  { href: "#market-overview", label: "Tape" },
  { href: "#market-dashboard", label: "Closes" },
  { href: "#key-figures", label: "Figures" },
  { href: "#detail", label: "Detail" },
];

interface SectionNavProps {
  hasFigures?: boolean;
  hasMarketOverview?: boolean;
  hasMarketDashboard?: boolean;
}

export function SectionNav({
  hasFigures = false,
  hasMarketOverview = false,
  hasMarketDashboard = false,
}: SectionNavProps) {
  const items = primary.filter((item) => {
    if (item.href === "#key-figures") return hasFigures;
    if (item.href === "#market-overview") return hasMarketOverview;
    if (item.href === "#market-dashboard") return hasMarketDashboard;
    return true;
  });

  return (
    <nav
      aria-label="Briefing sections"
      className="sticky top-0 z-20 border-b border-line/80 bg-mist/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-5 py-2 sm:px-8">
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
      <div
        aria-label="Detail modules"
        className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto border-t border-line/60 px-5 py-1.5 sm:px-8"
      >
        {DETAIL_TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.hashes[0]}`}
            className="focus-ring shrink-0 px-3 py-1 text-xs font-semibold tracking-wide text-ink-soft transition-colors hover:text-forest"
          >
            {tab.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
