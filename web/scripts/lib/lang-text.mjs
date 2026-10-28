export function enOf(text) {
  if (!text) return "";
  return typeof text === "string" ? text : text.en || "";
}
