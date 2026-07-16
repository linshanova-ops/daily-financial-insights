import Image from "next/image";
import Link from "next/link";
import syrMark from "../../public/brand/syr-mark.png";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link
        href="/"
        className="focus-ring display flex items-center gap-2.5 text-lg tracking-tight text-forest sm:gap-3 sm:text-xl"
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
      <SiteNav />
    </header>
  );
}
