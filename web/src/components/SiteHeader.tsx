import Link from "next/link";

const links = [
  { href: "/", label: "Today" },
  { href: "/briefings", label: "Archive" },
  { href: "/pipeline", label: "Pipeline" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="display text-lg tracking-tight text-forest sm:text-xl">
        syravocado
      </Link>
      <nav className="flex items-center gap-5 text-sm font-medium text-ink-soft">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-forest"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
