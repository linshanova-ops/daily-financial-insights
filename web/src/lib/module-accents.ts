/** Per-module accent palettes so each briefing section reads distinctly. */
export type ModuleAccent =
  | "forest"
  | "azure"
  | "crimson"
  | "violet"
  | "amber"
  | "copper";

export interface AccentClasses {
  eyebrow: string;
  bulletDot: string;
  stanceLabel: string;
  panel: string;
  headerBar: string;
}

export const accents: Record<ModuleAccent, AccentClasses> = {
  forest: {
    eyebrow: "text-forest",
    bulletDot: "bg-forest",
    stanceLabel: "text-forest",
    panel: "bg-forest/5 border-forest/25",
    headerBar: "bg-forest",
  },
  azure: {
    eyebrow: "text-azure",
    bulletDot: "bg-azure",
    stanceLabel: "text-azure",
    panel: "bg-azure/5 border-azure/25",
    headerBar: "bg-azure",
  },
  crimson: {
    eyebrow: "text-crimson",
    bulletDot: "bg-crimson",
    stanceLabel: "text-crimson",
    panel: "bg-crimson/5 border-crimson/25",
    headerBar: "bg-crimson",
  },
  violet: {
    eyebrow: "text-violet",
    bulletDot: "bg-violet",
    stanceLabel: "text-violet",
    panel: "bg-violet/5 border-violet/25",
    headerBar: "bg-violet",
  },
  amber: {
    eyebrow: "text-amber",
    bulletDot: "bg-amber",
    stanceLabel: "text-amber",
    panel: "bg-amber/5 border-amber/25",
    headerBar: "bg-amber",
  },
  copper: {
    eyebrow: "text-copper",
    bulletDot: "bg-copper",
    stanceLabel: "text-copper",
    panel: "bg-copper/5 border-copper/25",
    headerBar: "bg-copper",
  },
};
