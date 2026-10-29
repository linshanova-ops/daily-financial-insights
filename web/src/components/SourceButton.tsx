import type { ReactNode } from "react";
import type { FactSource } from "@/lib/types";
import { L } from "./L";

interface SourceButtonProps {
  sources?: FactSource[] | null;
  /** When true, mark single-source rows (credibility signal). */
  markSingle?: boolean;
}

/** Asia homepage is the mail hub, not an article. */
export function isSubscriptionMail(href: string): boolean {
  try {
    const u = new URL(href);
    return u.hostname === "www.bloomberg.com" && /^\/asia\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

export function SourceLabel({ source }: { source: FactSource }): ReactNode {
  if (!isSubscriptionMail(source.href)) return source.label;
  return (
    <L
      en={`${source.label} · subscription mail`}
      zh={`${source.label} · 订阅邮件来源`}
    />
  );
}

/** Compact source chips — label only; href on click. */
export function SourceButton({
  sources,
  markSingle = false,
}: SourceButtonProps) {
  if (!sources?.length) return null;

  return (
    <span className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 align-middle">
      {markSingle && sources.length === 1 ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">
          单源
        </span>
      ) : null}
      {sources.map((source) => {
        const className =
          "focus-ring inline-flex max-w-full whitespace-normal rounded-sm border border-line bg-paper/80 px-1.5 py-1 text-left text-[10px] font-medium leading-snug tracking-wide text-ink-soft";
        if (isSubscriptionMail(source.href)) {
          return (
            <span key={`${source.label}-mail`} className={className} title={source.label}>
              <SourceLabel source={source} />
            </span>
          );
        }
        return (
          <a
            key={`${source.label}-${source.href}`}
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            title={source.label}
            className={`${className} transition hover:border-forest/40 hover:text-forest`}
          >
            {source.label}
          </a>
        );
      })}
    </span>
  );
}
