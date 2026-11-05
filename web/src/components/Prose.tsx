import type { LangText } from "@/lib/lang-text";
import { dropRestatedScale } from "../../scripts/lib/scale-paren.mjs";
import { readerLine } from "../../scripts/lib/reader-shorthand.mjs";
import { L } from "./L";

function show(text: string) {
  const line = readerLine(dropRestatedScale(text));
  return line || null;
}

/** A pair is two sentences. A plain string is an older edition. Missing stays blank. */
export function Prose({ text }: { text?: LangText | null }) {
  if (!text || typeof text === "string") {
    return text ? show(text) : null;
  }
  const en = show(text.en);
  const zh = show(text.zh);
  if (!en && !zh) return null;
  return <L en={en ?? ""} zh={zh ?? ""} />;
}
