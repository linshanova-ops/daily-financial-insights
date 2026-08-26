import type { SignalGrade, ThemeCard } from "./types";

const RANK: Record<SignalGrade, number> = {
  STRONG: 0,
  MODERATE: 1,
  WEAK: 2,
};

/** Site order: STRONG → MODERATE → WEAK. Same-grade order is unchanged. */
export function themesByGrade(themes: ThemeCard[]): ThemeCard[] {
  return [...themes].sort(
    (a, b) => (RANK[a.grade] ?? 9) - (RANK[b.grade] ?? 9),
  );
}
