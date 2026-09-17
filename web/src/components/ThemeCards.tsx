import type { SignalGrade, ThemeCard } from "@/lib/types";
import { themesByGrade } from "@/lib/theme-grade-order";
import { SourceButton } from "./SourceButton";

const gradeStyles: Record<SignalGrade, string> = {
  STRONG: "bg-strong/10 text-strong",
  MODERATE: "bg-moderate/10 text-moderate",
  WEAK: "bg-weak/10 text-weak",
};

interface ThemeCardsProps {
  themes: ThemeCard[];
}

/** Split folded YAML into one line per sentence so cites aren't a wall. */
// ponytail: period + space; skip U.S./U.K. so "U.S. Treasury" stays one line.
function lines(text: string): string[] {
  return text.trim().split(/(?<!U\.S)(?<!U\.K)(?<=[.。])\s+/).filter(Boolean);
}

/** First ": " or "：" is the cite; rest is the print. Skip if the head looks like a clock. */
// ponytail: first cite cut within 48 chars; FactLine[] per bullet if prefixes stop matching.
function splitCite(line: string): { head: string; rest: string } | null {
  const ascii = line.indexOf(": ");
  const wide = line.indexOf("：");
  let cut = -1;
  let sep = 0;
  if (ascii > 0 && ascii <= 48) {
    cut = ascii;
    sep = 2;
  }
  if (wide > 0 && wide <= 48 && (cut < 0 || wide < cut)) {
    cut = wide;
    sep = 1;
  }
  if (cut < 0) return null;
  const head = line.slice(0, cut);
  if (/^\d{1,2}$/.test(head)) return null;
  return { head, rest: line.slice(cut + sep) };
}

function CiteLine({ line }: { line: string }) {
  const cite = splitCite(line);
  if (cite) {
    return (
      <li>
        <span className="font-semibold text-ink">{`${cite.head}：`}</span>
        {cite.rest}
      </li>
    );
  }
  return <li>{line}</li>;
}

function CopyBlock({
  label,
  text,
  sources,
}: {
  label: string;
  text: string;
  sources?: ThemeCard["factSources"];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink">
        {label}
      </p>
      <ul className="mt-3 space-y-4 text-base leading-relaxed text-ink-soft">
        {lines(text).map((line, i) => (
          <CiteLine key={i} line={line} />
        ))}
      </ul>
      {sources?.length ? (
        <div className="mt-3">
          <SourceButton sources={sources} />
        </div>
      ) : null}
    </div>
  );
}

/** Cross-asset forces: fact, then the so-what — copy first, cites after. */
export function ThemeCards({ themes }: ThemeCardsProps) {
  if (!themes.length) return null;
  const ordered = themesByGrade(themes);

  return (
    <section
      id="themes"
      className="section-band scroll-mt-28 border-y border-line/60 bg-paper/40"
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-amber" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
            Today&apos;s themes
          </p>
        </div>
        <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
          What moves markets today
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Each theme is one force: the print, what it means for the named
          books, and the dated print that settles it.
        </p>
        <ol className="mt-10 space-y-10">
          {ordered.map((theme, index) => {
            const so = lines(theme.mechanism);
            const next = so.length >= 2 ? so[so.length - 1] : null;
            const body = next ? so.slice(0, -1).join(" ") : theme.mechanism;
            return (
              <li
                key={theme.id}
                id={`theme-${theme.id}`}
                className="scroll-mt-28 border-b border-line pb-10 last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-sm font-semibold text-ink/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold tracking-[0.14em] ${gradeStyles[theme.grade]}`}
                  >
                    {theme.grade}
                  </span>
                  {theme.assets?.length ? (
                    <span className="text-xs tracking-wide text-ink/45">
                      {theme.assets.join(" · ")}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  {theme.title}
                </h3>
                <div className="mt-6 flex flex-col gap-8">
                  <CopyBlock
                    label="Fact"
                    text={theme.fact}
                    sources={theme.factSources}
                  />
                  <CopyBlock label="So what" text={body} />
                  {next ? <CopyBlock label="Next" text={next} /> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
