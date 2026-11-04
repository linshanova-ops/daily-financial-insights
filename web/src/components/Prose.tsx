import type { LangText } from "@/lib/lang-text";
import { dropRestatedScale } from "../../scripts/lib/scale-paren.mjs";
import { L } from "./L";

/** A pair is two sentences. A plain string is an older edition. Missing stays blank. */
export function Prose({ text }: { text?: LangText | null }) {
  if (!text || typeof text === "string") {
    return text ? dropRestatedScale(text) : null;
  }
  return <L en={dropRestatedScale(text.en)} zh={dropRestatedScale(text.zh)} />;
}
