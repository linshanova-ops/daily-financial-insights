"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, type MouseEvent } from "react";
import { resolveLang, type Lang } from "@/lib/lang";

function applyLang(lang: Lang, mode: "push" | "replace") {
  const root = document.documentElement;
  root.dataset.lang = lang;
  root.lang = lang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll<HTMLElement>("[data-lang-btn]").forEach((el) => {
    if (el.dataset.langBtn === lang) el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  });
  const url = new URL(window.location.href);
  const current = url.searchParams.get("lang");
  if (lang === "zh") {
    if (current === "zh") return;
    url.searchParams.set("lang", "zh");
  } else if (current == null) {
    return;
  } else {
    url.searchParams.delete("lang");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (mode === "push") history.pushState(null, "", next);
  else history.replaceState(null, "", next);
}

export function LangSwitch() {
  const pathname = usePathname();

  // ponytail: Next <Link> drops ?lang=. This writes it back from data-lang.
  // A new tab opened on a bare href is English. Put lang on every Link if that matters.
  useLayoutEffect(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    applyLang(
      resolveLang(query, document.documentElement.dataset.lang),
      "replace",
    );
  }, [pathname]);

  useEffect(() => {
    const onPop = () => {
      const query = new URLSearchParams(window.location.search).get("lang");
      applyLang(resolveLang(query), "replace");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function choose(event: MouseEvent<HTMLAnchorElement>, lang: Lang) {
    event.preventDefault();
    applyLang(lang, "push");
  }

  return (
    <nav aria-label="Language" className="lang-switch">
      <a
        href="?lang=zh"
        data-lang-btn="zh"
        className="focus-ring"
        onClick={(event) => choose(event, "zh")}
      >
        中文
      </a>
      <a
        href="?lang=en"
        data-lang-btn="en"
        className="focus-ring"
        onClick={(event) => choose(event, "en")}
      >
        English
      </a>
    </nav>
  );
}
