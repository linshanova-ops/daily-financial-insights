import type { LangText } from "@/lib/lang-text";
import { L } from "./L";

/** A pair is this edition's two sentences. A plain string is an older edition, shown as published. */
export function Prose({ text }: { text: LangText }) {
  if (typeof text === "string") return text;
  return <L en={text.en} zh={text.zh} />;
}
