"use client";

const sections = [
  { href: "#key-figures", label: "Figures" },
  { href: "#executive-summary", label: "Summary" },
  { href: "#global-situation", label: "Global" },
  { href: "#china-situation", label: "China" },
  { href: "#asset-framework", label: "Assets" },
  { href: "#signals", label: "Signals" },
  { href: "#watch", label: "Watch" },
  { href: "#sources", label: "Sources" },
];

interface SectionNavProps {
  hasFigures?: boolean;
}

export function SectionNav({ hasFigures = false }: SectionNavProps) {
  const items = hasFigures
    ? sections
    : sections.filter((item) => item.href !== "#key-figures");

  return (
    <nav
      aria-label="Briefing sections"
      className="sticky top-0 z-20 border-b border-line/80 bg-mist/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-5 py-2.5 sm:px-8">
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
