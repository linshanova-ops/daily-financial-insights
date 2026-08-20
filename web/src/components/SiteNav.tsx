"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today" },
  { href: "/briefings", label: "Archive" },
  { href: "/pipeline", label: "Pipeline" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Primary" className="flex items-center gap-5 text-sm font-medium">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring transition-colors hover:text-forest ${
              active
                ? "text-forest underline decoration-copper/60 underline-offset-4"
                : "text-ink-soft"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
