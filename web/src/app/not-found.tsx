import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-8">
      <h1 className="display text-4xl tracking-tight text-ink">
        Briefing not found
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        That date is not in the archive.
      </p>
      <Link
        href="/briefings"
        className="mt-8 inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
      >
        Browse archive
      </Link>
    </section>
  );
}
