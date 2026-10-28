import { zhText } from "@/lib/edition-zh";
import { L } from "./L";

/** Current-edition prose. Unmapped strings (already Chinese, or an older edition) stay as published. */
export function Prose({ text }: { text: string }) {
  const zh = zhText(text);
  if (zh === text) return text;
  return <L en={text} zh={zh} />;
}
