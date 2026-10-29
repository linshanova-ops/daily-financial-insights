"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { L } from "./L";

const links = [
  { href: "/", en: "Today", zh: "今日" },
  { href: "/briefings", en: "Archive", zh: "归档" },
  { href: "/pipeline", en: "Pipeline", zh: "流程" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring py-2 transition-colors hover:text-forest ${
              active
                ? "text-forest underline decoration-copper/60 underline-offset-4"
                : "text-ink-soft"
            }`}
          >
            <L en={link.en} zh={link.zh} />
          </Link>
        );
      })}
    </nav>
  );
}
