export type ContentKind = "fact" | "claim" | "judgment";

const styles: Record<ContentKind, string> = {
  fact: "bg-forest/10 text-forest border-forest/25",
  claim: "bg-violet/10 text-violet border-violet/30",
  judgment: "bg-amber/10 text-amber border-amber/30",
};

const labels: Record<ContentKind, string> = {
  fact: "Fact",
  claim: "Claim",
  judgment: "Judgment",
};

interface KindLabelProps {
  kind: ContentKind;
}

/** Badge: print (Fact) · third-party view (Claim) · our read (Judgment). */
export function KindLabel({ kind }: KindLabelProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${styles[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}
