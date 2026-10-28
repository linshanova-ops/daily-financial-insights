import Link from "next/link";
import { L } from "./L";

export function EmptyState() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-8">
      <h1 className="display text-4xl tracking-tight text-ink sm:text-5xl">
        <L en="No briefings published yet" zh="还没有已发布的简报" />
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        <L
          en="Add a Markdown file under web/content/briefings/ with the briefing frontmatter schema, then rebuild the site."
          zh="在 web/content/briefings/ 放入带简报前言的 Markdown，然后重新构建网站。"
        />
      </p>
      <Link
        href="/pipeline"
        className="mt-8 inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
      >
        <L en="View the research pipeline" zh="查看研究流程" />
      </Link>
    </section>
  );
}
