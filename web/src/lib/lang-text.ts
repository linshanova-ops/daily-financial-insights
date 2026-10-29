export type LangText = string | { en: string; zh: string };

export function enOf(text: LangText | null | undefined): string {
  if (!text) return "";
  return typeof text === "string" ? text : text.en;
}

export function zhOf(text: LangText | null | undefined): string {
  if (!text) return "";
  return typeof text === "string" ? text : text.zh;
}
