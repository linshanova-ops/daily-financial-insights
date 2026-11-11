/** Google Form for the reader check-ins. Empty url = no modals. Ids come from the form's pre-filled link. */
export const EMA_FORM = {
  url: "", // https://docs.google.com/forms/d/e/<form-id>/formResponse
  entry: {
    date: "entry.0",
    lang: "entry.0",
    modal: "entry.0",
    affect: "entry.0",
    thinking: "entry.0",
    reader: "entry.0",
  },
};

let pageReader = "";

/** Anonymous id kept in localStorage so answers pair up across modals and days. Per-page if storage is blocked. */
export function readerId(): string {
  const make = () => `r-${crypto.randomUUID().slice(0, 8)}`;
  try {
    let id = localStorage.getItem("ema-reader");
    if (!id) localStorage.setItem("ema-reader", (id = make()));
    return id;
  } catch {
    return (pageReader ||= make());
  }
}

/** Each prompt opens once, when `target` scrolls into view. */
export function emaPrompts(form: { url: string }) {
  if (!form.url) return [];
  return [
    { id: "market-closes", target: "#market-dashboard" },
    { id: "themes", target: "#themes ol > li:last-child" },
  ];
}
