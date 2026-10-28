import { L } from "./L";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-20 w-full max-w-6xl border-t border-line px-5 py-10 text-sm text-ink-soft sm:px-8">
      <p className="max-w-3xl leading-relaxed">
        <L
          en="syravocado publishes a weekday briefing from sourced desks. It is not investment advice. Verify figures against primary sources before acting on them."
          zh="syravocado 每个工作日发布一份有来源的简报。这不是投资建议。行动前请对照原始来源核对数字。"
        />
      </p>
    </footer>
  );
}
