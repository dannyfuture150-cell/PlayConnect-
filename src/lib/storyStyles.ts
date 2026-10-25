export interface FontOption {
  id: string;
  label: string;
  fontFamily: string;
}

export const STORY_FONTS: FontOption[] = [
  { id: "display", label: "Display", fontFamily: "var(--font-display), sans-serif" },
  { id: "sans", label: "Sans", fontFamily: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Serif", fontFamily: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" },
  { id: "impact", label: "Bold Impact", fontFamily: "Impact, 'Arial Black', sans-serif" },
  { id: "rounded", label: "Rounded", fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
  { id: "cursive", label: "Cursive", fontFamily: "'Brush Script MT', cursive" },
  { id: "condensed", label: "Condensed", fontFamily: "'Arial Narrow', sans-serif" },
];

export const STORY_TEXT_COLORS = [
  "#FFFFFF",
  "#0F172A",
  "#A855F7",
  "#F472B6",
  "#FBBF24",
  "#38BDF8",
  "#34D399",
  "#F87171",
];

export interface BackgroundOption {
  id: string;
  label: string;
  value: string; // CSS background value
}

export const STORY_BACKGROUNDS: BackgroundOption[] = [
  { id: "black", label: "Black", value: "#0B0B0F" },
  { id: "white", label: "White", value: "#FFFFFF" },
  { id: "violet", label: "Violet", value: "linear-gradient(135deg,#6D28D9,#C084FC)" },
  { id: "magenta", label: "Magenta", value: "linear-gradient(135deg,#9333EA,#F472B6)" },
  { id: "blue", label: "Blue", value: "linear-gradient(135deg,#1D4ED8,#38BDF8)" },
  { id: "green", label: "Green", value: "linear-gradient(135deg,#047857,#34D399)" },
  { id: "sunset", label: "Sunset", value: "linear-gradient(135deg,#EA580C,#FBBF24)" },
  { id: "galaxy", label: "Galaxy", value: "linear-gradient(135deg,#1E1B4B,#7C3AED,#EC4899)" },
];
