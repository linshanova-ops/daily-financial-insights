import type { ReactNode } from "react";

/** One span per language. CSS on html[data-lang] shows one. */
export function L({ en, zh }: { en: ReactNode; zh: ReactNode }) {
  return (
    <span className="lang-pair"><span className="lang-en">{en}</span><span className="lang-zh">{zh}</span></span>
  );
}
