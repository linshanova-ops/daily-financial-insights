import Link from "next/link";
import { L } from "@/components/L";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-8">
      <h1 className="display text-4xl tracking-tight text-ink">
        <L en="Briefing not found" zh="没有该期简报" />
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        <L en="That date is not in the archive." zh="归档中没有该日期。" />
      </p>
      <Link
        href="/briefings"
        className="mt-8 inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
      >
        <L en="Browse archive" zh="浏览归档" />
      </Link>
    </section>
  );
}
