import Link from "next/link";

export function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-8">
      <h1 className="display text-4xl tracking-tight text-ink sm:text-5xl">
        No briefings published yet
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        Add a Markdown file under <code>web/content/briefings/</code> with the
        briefing frontmatter schema, then rebuild the site.
      </p>
      <Link
        href="/pipeline"
        className="mt-8 inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
      >
        View the research pipeline
      </Link>
    </section>
  );
}
