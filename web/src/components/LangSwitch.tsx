"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, type MouseEvent } from "react";
import { resolveLang, type Lang } from "@/lib/lang";

function stampInAppLinks(lang: Lang) {
  document.querySelectorAll<HTMLAnchorElement>("a[href^='/']").forEach((a) => {
    const raw = a.getAttribute("href");
    if (!raw) return;
    const hashAt = raw.indexOf("#");
    const path = hashAt < 0 ? raw : raw.slice(0, hashAt);
    const hash = hashAt < 0 ? "" : raw.slice(hashAt);
    const url = new URL(path, window.location.origin);
    if (lang === "zh") url.searchParams.set("lang", "zh");
    else url.searchParams.delete("lang");
    const next = `${url.pathname}${url.search}${hash}`;
    if (raw !== next) a.setAttribute("href", next);
  });
}

function stampAlts(lang: Lang) {
  document.querySelectorAll<HTMLImageElement>("img[data-alt-en]").forEach((img) => {
    const next = lang === "zh" ? img.dataset.altZh : img.dataset.altEn;
    if (next && img.alt !== next) img.alt = next;
  });
}

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
  stampInAppLinks(lang);
  stampAlts(lang);
}

export function LangSwitch() {
  const pathname = usePathname();

  // ponytail: Next <Link> drops ?lang=. Stamp the DOM href so a new tab stays on zh.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const run = () => {
      const query = new URLSearchParams(window.location.search).get("lang");
      const lang = resolveLang(query, root.dataset.lang);
      root.dataset.lang = lang;
      root.lang = lang === "zh" ? "zh-CN" : "en";
      stampInAppLinks(lang);
      stampAlts(lang);
    };
    run();
    const obs = new MutationObserver(run);
    obs.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    return () => obs.disconnect();
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
