"use client";

import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  DETAIL_TABS,
  detailTabFromHash,
  isKnownDetailHash,
  type DetailTabId,
} from "@/lib/detail-tabs";

export type DetailTabPanels = Record<DetailTabId, ReactNode>;

interface DetailTabsProps {
  panels: DetailTabPanels;
}

export function DetailTabs({ panels }: DetailTabsProps) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<DetailTabId>("signals");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (!isKnownDetailHash(hash)) return;
      setOpen(true);
      setActive(detailTabFromHash(hash));
      requestAnimationFrame(() => {
        document.getElementById("detail")?.scrollIntoView({ block: "start" });
      });
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function openModules(id: DetailTabId = "signals", syncHash = true) {
    setOpen(true);
    setActive(id);
    if (!syncHash) return;
    const hash = DETAIL_TABS.find((t) => t.id === id)?.hashes[0] ?? "detail";
    const next = `#${hash}`;
    if (window.location.hash !== next) {
      history.replaceState(null, "", next);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  function selectTab(id: DetailTabId, syncHash: boolean) {
    setActive(id);
    if (!syncHash) return;
    const hash = DETAIL_TABS.find((t) => t.id === id)?.hashes[0];
    if (hash) {
      const next = `#${hash}`;
      if (window.location.hash !== next) {
        history.replaceState(null, "", next);
      }
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + DETAIL_TABS.length) % DETAIL_TABS.length;
    const tab = DETAIL_TABS[next];
    selectTab(tab.id, true);
    document.getElementById(`${baseId}-tab-${tab.id}`)?.focus();
  }

  return (
    <section id="detail" className="scroll-mt-28">
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
          Detail
        </p>
        <h2 className="display mt-2 text-3xl tracking-tight text-ink sm:text-4xl">
          Full briefing modules
        </h2>
        {!open ? (
          <div className="mt-6">
            <button
              type="button"
              className="focus-ring inline-flex items-center bg-forest px-5 py-3 text-sm font-semibold text-paper transition hover:bg-forest-bright"
              aria-expanded={false}
              onClick={() => openModules("signals", true)}
            >
              Open Detail modules
            </button>
          </div>
        ) : (
          <div
            role="tablist"
            aria-label="Briefing detail modules"
            className="mt-6 flex gap-1 overflow-x-auto border-b border-line pb-px"
          >
            {DETAIL_TABS.map((tab, index) => {
              const selected = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`focus-ring shrink-0 px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                    selected
                      ? "border-b-2 border-forest text-forest"
                      : "text-ink-soft hover:text-forest"
                  }`}
                  onClick={() => selectTab(tab.id, true)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {open
        ? DETAIL_TABS.map((tab) => {
            const selected = active === tab.id;
            return (
              <div
                key={tab.id}
                role="tabpanel"
                id={`${baseId}-panel-${tab.id}`}
                aria-labelledby={`${baseId}-tab-${tab.id}`}
                hidden={!selected}
              >
                {panels[tab.id]}
              </div>
            );
          })
        : null}
      {/* Keep module content mounted for static completeness when closed */}
      {!open
        ? DETAIL_TABS.map((tab) => (
            <div key={`closed-${tab.id}`} hidden>
              {panels[tab.id]}
            </div>
          ))
        : null}
    </section>
  );
}
