"use client";

import { useState } from "react";

export function useCollapsedList<T>(items: T[], initialVisible = 5) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = items.length > initialVisible;
  const visible =
    expanded || !needsCollapse ? items : items.slice(0, initialVisible);
  const hiddenCount = Math.max(0, items.length - initialVisible);

  return {
    visible,
    needsCollapse,
    expanded,
    hiddenCount,
    toggle: () => setExpanded((value) => !value),
  };
}

interface CollapseToggleProps {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
  moreLabel?: string;
  lessLabel?: string;
}

export function CollapseToggle({
  expanded,
  hiddenCount,
  onToggle,
  moreLabel = "Show more",
  lessLabel = "Show less",
}: CollapseToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="focus-ring mt-6 text-sm font-semibold text-forest underline decoration-copper/50 underline-offset-4"
    >
      {expanded ? lessLabel : `${moreLabel} (${hiddenCount})`}
    </button>
  );
}
