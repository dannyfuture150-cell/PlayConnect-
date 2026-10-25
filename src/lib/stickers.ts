/** Built-in chat stickers. Each is a big emoji on a coloured card with a short caption (no image files needed). */
export interface Sticker { id: string; emoji: string; label: string; bg: string }

export const STICKERS: Sticker[] = [
  { id: "gg", emoji: "🤝", label: "GG", bg: "linear-gradient(135deg,#0ea5e9,#2563eb)" },
  { id: "wp", emoji: "👏", label: "Well played", bg: "linear-gradient(135deg,#10b981,#059669)" },
  { id: "goal", emoji: "⚽", label: "GOAL!", bg: "linear-gradient(135deg,#16a34a,#15803d)" },
  { id: "fire", emoji: "🔥", label: "On fire", bg: "linear-gradient(135deg,#ef4444,#f97316)" },
  { id: "win", emoji: "🏆", label: "Winner", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { id: "king", emoji: "👑", label: "King", bg: "linear-gradient(135deg,#a855f7,#7c3aed)" },
  { id: "rematch", emoji: "🔁", label: "Rematch?", bg: "linear-gradient(135deg,#6366f1,#4338ca)" },
  { id: "ready", emoji: "🎮", label: "Ready?", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
  { id: "late", emoji: "⏰", label: "Where are you?", bg: "linear-gradient(135deg,#f43f5e,#be123c)" },
  { id: "wait", emoji: "😴", label: "Waiting…", bg: "linear-gradient(135deg,#64748b,#334155)" },
  { id: "lol", emoji: "😂", label: "LOL", bg: "linear-gradient(135deg,#facc15,#f59e0b)" },
  { id: "noway", emoji: "🤯", label: "No way!", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
  { id: "easy", emoji: "😎", label: "Easy", bg: "linear-gradient(135deg,#06b6d4,#0e7490)" },
  { id: "close", emoji: "😤", label: "So close", bg: "linear-gradient(135deg,#fb923c,#ea580c)" },
  { id: "unlucky", emoji: "😭", label: "Unlucky", bg: "linear-gradient(135deg,#38bdf8,#0284c7)" },
  { id: "clown", emoji: "🤡", label: "Clowned", bg: "linear-gradient(135deg,#f87171,#dc2626)" },
  { id: "respect", emoji: "🫡", label: "Respect", bg: "linear-gradient(135deg,#34d399,#047857)" },
  { id: "thanks", emoji: "🙏", label: "Thanks", bg: "linear-gradient(135deg,#a78bfa,#7c3aed)" },
  { id: "love", emoji: "❤️", label: "Love it", bg: "linear-gradient(135deg,#fb7185,#e11d48)" },
  { id: "ghost", emoji: "👻", label: "Ghosted", bg: "linear-gradient(135deg,#94a3b8,#475569)" },
];

export const stickerById = (id: string | null | undefined) => (id ? STICKERS.find((s) => s.id === id) : undefined);
