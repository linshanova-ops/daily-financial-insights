"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { DETAIL_TABS, isKnownDetailHash } from "@/lib/detail-tabs";

interface SectionNavProps {
  hasFigures?: boolean;
  hasMarketOverview?: boolean;
  hasMarketDashboard?: boolean;
  hasThemes?: boolean;
  hasSignals?: boolean;
  hasCalendar?: boolean;
}

export function SectionNav({
  hasFigures = false,
  hasMarketOverview = false,
  hasMarketDashboard = false,
  hasThemes = false,
  hasSignals = false,
  hasCalendar = false,
}: SectionNavProps) {
  const [modulesOpen, setModulesOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (isKnownDetailHash(window.location.hash)) {
        setModulesOpen(true);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const skimItems = [
    { href: "#skim", label: "Skim" },
    ...(hasThemes ? [{ href: "#themes", label: "Themes" }] : []),
    ...(hasMarketOverview
      ? [{ href: "#market-overview", label: "Tape" }]
      : []),
    ...(hasMarketDashboard
      ? [{ href: "#market-dashboard", label: "Closes" }]
      : []),
    ...(hasFigures ? [{ href: "#key-figures", label: "Figures" }] : []),
    ...(hasSignals ? [{ href: "#signals", label: "Signals" }] : []),
    ...(hasCalendar ? [{ href: "#calendar", label: "Calendar" }] : []),
  ];

  function onDetailClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const nextOpen = !modulesOpen;
    setModulesOpen(nextOpen);
    if (nextOpen) {
      if (window.location.hash !== "#detail") {
        history.replaceState(null, "", "#detail");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }
  }

  return (
    <nav
      aria-label="Briefing sections"
      className="sticky top-0 z-20 border-b border-line/80 bg-mist/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 overflow-x-auto px-5 py-2 sm:px-8">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">
          速览
        </span>
        {skimItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="focus-ring shrink-0 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-soft transition-colors hover:text-forest"
          >
            {item.label}
          </a>
        ))}
        <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/40">
          深读
        </span>
        <a
          href="#detail"
          aria-expanded={modulesOpen}
          aria-controls="detail-module-nav"
          className={`focus-ring shrink-0 px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors hover:text-forest ${
            modulesOpen ? "text-forest" : "text-ink-soft"
          }`}
          onClick={onDetailClick}
        >
          Detail
        </a>
      </div>
      {modulesOpen ? (
        <div
          id="detail-module-nav"
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
      ) : null}
    </nav>
  );
}
