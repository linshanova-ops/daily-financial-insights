"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import avocadoMascot from "../../public/brand/avocado-mascot.png";
import { EMA_FORM, emaPrompts, readerId } from "@/lib/ema";
import { L } from "./L";

const PROMPTS = emaPrompts(EMA_FORM);

// Submitted as "English: emoji 中文", the form's option text; Google Forms rejects choices that don't match.
const QUESTIONS: Record<string, { field: "affect" | "thinking"; en: string; zh: string; options: string[][] }> = {
  "market-closes": {
    field: "affect",
    en: "How do these closes make you feel right now?",
    zh: "看到这些收盘数据，你现在的感受是？",
    options: [
      ["😰", "Anxious", "焦虑"],
      ["😟", "Uneasy", "有点不安"],
      ["😐", "Neutral", "平静"],
      ["🙂", "Reassured", "安心"],
      ["🤩", "Excited", "兴奋"],
    ],
  },
  themes: {
    field: "thinking",
    en: "After today's themes, what's your first thought?",
    zh: "读完今天的主题，你的第一个想法是？",
    options: [
      ["🏃", "I want to act now", "想马上行动"],
      ["⏳", "I'll wait and watch", "再观察一下"],
      ["🛡️", "Protect what I have", "先守住已有的"],
      ["🔍", "I want to know more", "想再多了解"],
      ["🤷", "Doesn't affect me", "跟我关系不大"],
    ],
  },
};

const pageLang = () => (document.documentElement.dataset.lang === "zh" ? "zh" : "en");

export function EmaPrompts({ date }: { date: string }) {
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [thanked, setThanked] = useState<string | null>(null);

  useEffect(() => {
    const observers = PROMPTS.map(({ id, target }) => {
      const key = `ema-${id}`;
      const dialog = document.getElementById(key) as HTMLDialogElement | null;
      const el = document.querySelector(target);
      const obs = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting) || !dialog || dialog.open) return;
        obs.disconnect();
        sessionStorage.setItem(key, "1");
        setLang(pageLang());
        dialog.showModal();
      }, { rootMargin: "0px 0px -50% 0px" });
      if (el && !sessionStorage.getItem(key)) obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function answer(dialog: HTMLDialogElement, modal: string, value: string) {
    const { entry } = EMA_FORM;
    const body = new URLSearchParams({
      [entry.date]: date,
      [entry.lang]: pageLang(),
      [entry.modal]: modal,
      [entry.reader]: readerId(),
      [entry[QUESTIONS[modal].field]]: value,
    });
    fetch(EMA_FORM.url, { method: "POST", mode: "no-cors", body }).catch(() => {});
    setThanked(modal);
    setTimeout(() => dialog.close(), 1500);
  }

  return PROMPTS.map(({ id }) => {
    const q = QUESTIONS[id];
    return (
      <dialog
        key={id}
        id={`ema-${id}`}
        aria-labelledby={`ema-${id}-title`}
        className="m-auto w-[min(400px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] border border-line bg-paper p-5 text-sm text-ink backdrop:bg-ink/40"
      >
        {thanked === id ? (
          <div role="status" className="flex flex-col items-center gap-2 py-4 text-base font-medium">
            <span className="ema-beat relative">
              <Image src={avocadoMascot} alt="" width={80} height={80} className="h-20 w-20 object-contain" />
              <span className="absolute -right-1 -top-1 text-2xl text-crimson" aria-hidden>♥</span>
            </span>
            <L en="Thanks!" zh="谢谢！" />
          </div>
        ) : (
          <>
            <h2 id={`ema-${id}-title`} className="text-base font-semibold">
              <L en={q.en} zh={q.zh} />
            </h2>
            <div className="mt-4 grid grid-cols-5 gap-1">
              {q.options.map(([emoji, en, zh]) => (
                <button
                  key={en}
                  type="button"
                  aria-label={lang === "zh" ? zh : en}
                  className="focus-ring flex flex-col items-center gap-1 rounded px-1 py-2 text-center text-xs leading-tight hover:bg-line/40"
                  onClick={(event) => answer(event.currentTarget.closest("dialog")!, id, `${en}: ${emoji} ${zh}`)}
                >
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  <L en={en} zh={zh} />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              <L en="Anonymous: no name, email, or account is collected." zh="匿名填写：不收集姓名、邮箱或账号。" />
            </p>
            <div className="mt-2 text-right">
              <button
                type="button"
                className="focus-ring text-xs text-ink-soft underline"
                onClick={(event) => event.currentTarget.closest("dialog")!.close()}
              >
                <L en="Skip" zh="跳过" />
              </button>
            </div>
          </>
        )}
      </dialog>
    );
  });
}
