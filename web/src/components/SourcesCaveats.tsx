import { linkifySources } from "@/lib/source-links";

interface SourcesCaveatsProps {
  sources: string;
  singleSource: string;
}

function LinkedSourceText({ text }: { text: string }) {
  const parts = linkifySources(text);
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={`t-${index}`}>{part}</span>
        ) : (
          <a
            key={`${part.label}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring font-semibold text-forest underline decoration-copper/40 underline-offset-4 transition hover:text-forest-bright"
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}

export function SourcesCaveats({
  sources,
  singleSource,
}: SourcesCaveatsProps) {
  return (
    <section id="sources" className="scroll-mt-24 mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-ink/50" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/60">
          Sources & caveats
        </p>
      </div>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        Traceability
      </h2>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Primary sources consulted: </span>
          <LinkedSourceText text={sources} />
        </p>
        <p>
          <span className="font-semibold text-ink">Single-source items relied on: </span>
          {singleSource}
        </p>
      </div>
      <blockquote className="mt-8 border-l-2 border-forest pl-4 text-sm italic leading-relaxed text-ink-soft">
        This report is research and information synthesis, not investment
        advice. Verify figures against primary sources before acting on them.
      </blockquote>
    </section>
  );
}
