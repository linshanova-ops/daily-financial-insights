"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const FUND_SIGNAL_URL =
  "https://fund-signal-top50.uniweiqijia.chatgpt.site/";

const links = [
  { href: "/", label: "Today", external: false },
  { href: "/briefings", label: "Archive", external: false },
  { href: "/pipeline", label: "Pipeline", external: false },
  { href: FUND_SIGNAL_URL, label: "Fund", external: true },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass = (active: boolean) =>
  `focus-ring transition-colors hover:text-forest ${
    active
      ? "text-forest underline decoration-copper/60 underline-offset-4"
      : "text-ink-soft"
  }`;

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Primary" className="flex items-center gap-5 text-sm font-medium">
      {links.map((link) => {
        if (link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass(false)}
            >
              {link.label}
            </a>
          );
        }

        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={linkClass(active)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
