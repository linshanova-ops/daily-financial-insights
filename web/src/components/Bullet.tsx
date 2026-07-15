import type { FactSource } from "@/lib/types";
import { SourceButton } from "./SourceButton";

interface BulletProps {
  dotClass: string;
  children: React.ReactNode;
  sources?: FactSource[] | null;
}

/** List item with a colored dot marker and optional source buttons. */
export function Bullet({ dotClass, children, sources }: BulletProps) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-[0.55em] inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <span>{children}</span>
        <SourceButton sources={sources} />
      </div>
    </li>
  );
}
