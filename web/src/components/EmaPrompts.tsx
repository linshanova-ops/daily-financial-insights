"use client";

import { useEffect, type FormEvent } from "react";
import { EMA_FORM, emaPrompts } from "@/lib/ema";
import { L } from "./L";

const PROMPTS = emaPrompts(EMA_FORM);

// Option values are the English text: Google Forms rejects choices that don't match an option.
const AFFECT = [
  ["Very anxious", "非常焦虑"],
  ["Somewhat anxious", "有点焦虑"],
  ["Neither anxious nor calm", "说不上焦虑或平静"],
  ["Somewhat calm", "比较平静"],
  ["Very calm", "非常平静"],
];
const THINKING = [
  ["I want to act now", "我想马上采取行动"],
  ["I'll wait for more information", "我会等更多信息再说"],
  ["I'm worried about my savings or investments", "我担心自己的储蓄或投资"],
  ["This doesn't affect me", "这和我关系不大"],
  ["I'm just following the news", "我只是了解一下新闻"],
];
const TITLES: Record<string, [string, string]> = {
  "market-closes": ["After the market closes", "看完市场收盘"],
  themes: ["After today's themes", "看完今日主题"],
};

function Choices({ name, options }: { name: string; options: string[][] }) {
  return options.map(([en, zh]) => (
    <label key={en} className="flex items-start gap-2 py-1">
      <input type="radio" name={name} value={en} required className="mt-1" />
      <L en={en} zh={zh} />
    </label>
  ));
}

export function EmaPrompts({ date }: { date: string }) {
  useEffect(() => {
    const observers = PROMPTS.map(({ id, target }) => {
      const key = `ema-${id}`;
      const dialog = document.getElementById(key) as HTMLDialogElement | null;
      const el = document.querySelector(target);
      const obs = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting) || !dialog || dialog.open) return;
        obs.disconnect();
        sessionStorage.setItem(key, "1");
        dialog.showModal();
      });
      if (el && !sessionStorage.getItem(key)) obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  function submit(event: FormEvent<HTMLFormElement>, modal: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { entry } = EMA_FORM;
    const body = new URLSearchParams({
      [entry.date]: date,
      [entry.lang]: document.documentElement.dataset.lang === "zh" ? "zh" : "en",
      [entry.modal]: modal,
      [entry.affect]: String(form.get("affect")),
      [entry.thinking]: String(form.get("thinking")),
    });
    fetch(EMA_FORM.url, { method: "POST", mode: "no-cors", body }).catch(() => {});
    (event.currentTarget.closest("dialog") as HTMLDialogElement).close();
  }

  return PROMPTS.map(({ id }) => (
    <dialog
      key={id}
      id={`ema-${id}`}
      aria-labelledby={`ema-${id}-title`}
      className="m-auto w-[min(400px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] border border-line bg-paper p-5 text-sm text-ink backdrop:bg-ink/40"
    >
      <form onSubmit={(event) => submit(event, id)}>
        <h2 id={`ema-${id}-title`} className="text-base font-semibold">
          <L en={TITLES[id][0]} zh={TITLES[id][1]} />
        </h2>
        <fieldset className="mt-3">
          <legend className="font-medium">
            <L en="Right now, how do you feel?" zh="此刻你的感受是？" />
          </legend>
          <Choices name="affect" options={AFFECT} />
        </fieldset>
        <fieldset className="mt-3">
          <legend className="font-medium">
            <L en="Which thought is closest to yours?" zh="哪个想法最接近你现在的想法？" />
          </legend>
          <Choices name="thinking" options={THINKING} />
        </fieldset>
        <p className="mt-3 text-xs text-ink-soft">
          <L en="Anonymous: no name, email, or account is collected." zh="匿名填写：不收集姓名、邮箱或账号。" />
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            className="focus-ring px-3 py-1.5 text-ink-soft"
            onClick={(event) => (event.currentTarget.closest("dialog") as HTMLDialogElement).close()}
          >
            <L en="Skip" zh="跳过" />
          </button>
          <button type="submit" className="focus-ring bg-ink px-3 py-1.5 text-paper">
            <L en="Submit" zh="提交" />
          </button>
        </div>
      </form>
    </dialog>
  ));
}
