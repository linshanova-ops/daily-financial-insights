interface SituationBlockProps {
  eyebrow: string;
  title: string;
  stanceLabel: string;
  stance: string;
  changed: string[];
  implies: string[];
  tensionsLabel: string;
  tensions: string;
}

export function SituationBlock({
  eyebrow,
  title,
  stanceLabel,
  stance,
  changed,
  implies,
  tensionsLabel,
  tensions,
}: SituationBlockProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-copper">
        {eyebrow}
      </p>
      <h2 className="display mt-3 text-3xl tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-ink-soft sm:text-lg">
        <span className="font-semibold text-forest">{stanceLabel}: </span>
        {stance}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink">
            What changed
          </h3>
          <ul className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
            {changed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink">
            What it implies
          </h3>
          <ul className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
            {implies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink">
          {tensionsLabel}
        </h3>
        <p className="mt-3 max-w-4xl text-base leading-relaxed text-ink-soft">
          {tensions}
        </p>
      </div>
    </section>
  );
}
