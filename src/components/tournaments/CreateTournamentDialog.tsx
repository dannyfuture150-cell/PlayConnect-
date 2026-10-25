"use client";

import { LEADERBOARD_GAMES } from "@/lib/leaderboardGames";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useCreateTournament } from "@/hooks/useTournaments";
import { STAR_RULES } from "@/lib/starsCatalog";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FORMATS = [
  { value: "single_elimination", label: "Single elimination" },
] as const;

export interface TournamentTemplate {
  title: string; game: string; description: string; format: "single_elimination" | "double_elimination" | "round_robin";
  maxParticipants: number; entryType: "free" | "paid" | "stars"; entryFee: string | null; starsFee?: number | null; prize: string | null;
}

export function CreateTournamentDialog({
  className, initial, label = "New tournament", variant,
}: { className?: string; initial?: TournamentTemplate; label?: string; variant?: "default" | "outline" }) {
  const { profile } = useAuth();
  const createTournament = useCreateTournament();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [game, setGame] = useState(initial?.game ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [format, setFormat] = useState<typeof FORMATS[number]["value"]>(initial?.format === "single_elimination" || !initial ? "single_elimination" : "single_elimination");
  const [maxParticipants, setMaxParticipants] = useState(initial?.maxParticipants ?? 8);
  const [startsAt, setStartsAt] = useState("");
  const [entryType, setEntryType] = useState<"free" | "paid" | "stars">(initial?.entryType ?? "free");
  const [starsFee, setStarsFee] = useState(String(initial?.starsFee ?? 10));
  const [entryFee, setEntryFee] = useState(initial?.entryFee ?? "");
  const [prize, setPrize] = useState(initial?.prize ?? "");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreate() {
    if (!profile || !title.trim() || !game.trim() || !startsAt) return;
    if (entryType === "paid" && !entryFee.trim()) return;
    if (entryType === "stars" && !(Number(starsFee) >= 1)) return;
    setSubmitError(null);
    try {
      await createTournament.mutateAsync({
        title,
        game,
        description,
        format,
        maxParticipants,
        startsAt: new Date(startsAt),
        organizerId: profile.uid,
        entryType,
        entryFee: entryType === "paid" ? entryFee.trim() : null,
        starsFee: entryType === "stars" ? Math.min(10000, Math.max(1, Math.round(Number(starsFee)))) : null,
        prize: prize.trim() || null,
      });
      setOpen(false);
      if (!initial) {
        setTitle("");
        setGame("");
        setDescription("");
        setEntryType("free");
        setEntryFee("");
        setPrize("");
      }
      setStartsAt("");
    } catch (e) {
      setSubmitError((e as Error)?.message || "Couldn't create that tournament. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className={className}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>Create a tournament</DialogTitle>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend Cup" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-game">Game</Label>
            <select
              id="t-game"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="">Choose a game…</option>
              {LEADERBOARD_GAMES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-format">Format</Label>
              <select
                id="t-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-max">Max players</Label>
              <Input
                id="t-max"
                type="number"
                min={2}
                max={128}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-starts">Starts</Label>
            <Input id="t-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Entry</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEntryType("free")}
                className={cn(
                  "rounded-xl border-2 p-3 text-center transition-colors",
                  entryType === "free" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
                )}
              >
                <span className="block text-sm font-semibold text-foreground">Free</span>
                <span className="text-[11px] text-steel/50">Anyone can join instantly</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryType("paid")}
                className={cn(
                  "rounded-xl border-2 p-3 text-center transition-colors",
                  entryType === "paid" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
                )}
              >
                <span className="block text-sm font-semibold text-foreground">Paid</span>
                <span className="text-[11px] text-steel/50">You approve each join request</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryType("stars")}
                className={cn(
                  "rounded-xl border-2 p-3 text-center transition-colors",
                  entryType === "stars" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
                )}
              >
                <span className="block text-sm font-semibold text-foreground">🪙 PlayCoins</span>
                <span className="text-[11px] text-steel/50">Players pay with PlayCoins</span>
              </button>
            </div>
          </div>

          {entryType === "stars" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-stars">Entry price (PlayCoins)</Label>
              <Input id="t-stars" inputMode="numeric" value={starsFee} onChange={(e) => setStarsFee(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 10" />
              <p className="text-xs text-steel/40">
                Players pay this many PlayCoins to join, and it&apos;s taken from them automatically. They get it back if they leave before the bracket starts. PlayCoins paid to enter are used up, not paid to you.
              </p>
            </div>
          )}

          {entryType === "paid" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-fee">Entry fee</Label>
              <Input
                id="t-fee"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="e.g. $5, 500 coins — however you'll actually collect it"
              />
              <p className="text-xs text-steel/40">
                PlayConnect doesn&apos;t process payments — this is just shown to players, and you&apos;ll approve each
                request yourself once you&apos;ve confirmed payment however you arrange it with them.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-prize">Prize (optional)</Label>
            <Input id="t-prize" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. $100 cash, winner takes all" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Rules, anything players should know" />
          </div>
          <p className="text-xs text-steel/60">Creating a tournament costs {STAR_RULES.createTournamentFee} 🪙 PlayCoins.</p>
          {submitError && <p className="text-sm text-signal-red">{submitError}</p>}
          <Button
            onClick={handleCreate}
            disabled={
              !title.trim() ||
              !game.trim() ||
              !startsAt ||
              (entryType === "paid" && !entryFee.trim()) ||
              (entryType === "stars" && !(Number(starsFee) >= 1)) ||
              createTournament.isPending
            }
          >
            {createTournament.isPending ? "Creating…" : `Create tournament · ${STAR_RULES.createTournamentFee} 🪙`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
