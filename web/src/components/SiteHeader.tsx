import Image from "next/image";
import Link from "next/link";
import syrMark from "../../public/brand/syr-mark.png";

const links = [
  { href: "/", label: "Today" },
  { href: "/briefings", label: "Archive" },
  { href: "/pipeline", label: "Pipeline" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link
        href="/"
        className="display flex items-center gap-2.5 text-lg tracking-tight text-forest sm:gap-3 sm:text-xl"
      >
        <Image
          src={syrMark}
          alt=""
          width={36}
          height={36}
          className="h-8 w-8 rounded-sm shadow-sm sm:h-9 sm:w-9"
          priority
        />
        <span>syravocado</span>
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
