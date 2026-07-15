interface BulletProps {
  dotClass: string;
  children: React.ReactNode;
}

/** List item with a colored dot marker for scannable module bullets. */
export function Bullet({ dotClass, children }: BulletProps) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-[0.55em] inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}
