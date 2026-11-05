import type { Metadata } from "next";
import Link from "next/link";
import { L } from "@/components/L";

export const metadata: Metadata = {
  title: { absolute: "Page not found · syravocado" },
};

const titleScript = `(function(){var en="Page not found · syravocado",zh="页面不存在 · syravocado";function apply(){document.title=document.documentElement.dataset.lang==="zh"?zh:en}apply();new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:["data-lang"]})})();`;

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-5 py-20 sm:px-8">
      <script dangerouslySetInnerHTML={{ __html: titleScript }} />
      <h1 className="display text-4xl tracking-tight text-ink">
        <L en="Page not found" zh="页面不存在" />
      </h1>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
        >
          <L en="Today" zh="今日" />
        </Link>
        <Link
          href="/briefings"
          className="inline-flex w-fit bg-forest px-5 py-3 text-sm font-semibold text-paper"
        >
          <L en="Archive" zh="归档" />
        </Link>
      </div>
    </section>
  );
}
