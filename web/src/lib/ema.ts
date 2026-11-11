/** Google Form for the reader check-ins. Empty url = no modals. Ids come from the form's pre-filled link. */
export const EMA_FORM = {
  url: "https://docs.google.com/forms/d/e/1FAIpQLSc8-3M5l20sEGIgLgzHOixQ91LQC2EscLBgR85nbXVNw51PXA/formResponse",
  entry: {
    date: "entry.197380171",
    lang: "entry.1719329092",
    modal: "entry.108618894",
    affect: "entry.1655608938",
    thinking: "entry.913333609",
    reader: "entry.302496883",
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

/** YYYY-MM-DD in Asia/Shanghai, the briefing's day. */
export const shanghaiDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });

const shownThisPage = new Set<string>();

/** Each prompt shows once per day per browser (answered or skipped); per page if storage is blocked. */
export function shownToday(id: string): boolean {
  try {
    return localStorage.getItem(`ema-${id}`) === shanghaiDay();
  } catch {
    return shownThisPage.has(id);
  }
}

export function markShown(id: string) {
  try {
    localStorage.setItem(`ema-${id}`, shanghaiDay());
  } catch {
    shownThisPage.add(id);
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
