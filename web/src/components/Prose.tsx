import type { LangText } from "@/lib/lang-text";
import { L } from "./L";

/** A pair is two sentences. A plain string is an older edition. Missing stays blank. */
export function Prose({ text }: { text?: LangText | null }) {
  if (!text || typeof text === "string") return text || null;
  return <L en={text.en} zh={text.zh} />;
}
