interface SourcesCaveatsProps {
  sources: string;
  singleSource: string;
}

export function SourcesCaveats({
  sources,
  singleSource,
}: SourcesCaveatsProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        Sources & caveats
      </p>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        Traceability
      </h2>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Primary sources consulted: </span>
          {sources}
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
