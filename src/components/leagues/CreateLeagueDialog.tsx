"use client";

import { LEADERBOARD_GAMES } from "@/lib/leaderboardGames";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useCreateLeague } from "@/hooks/useLeagues";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CreateLeagueDialog() {
  const { profile } = useAuth();
  const router = useRouter();
  const createLeague = useCreateLeague();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [entryType, setEntryType] = useState<"free" | "paid">("free");
  const [entryFee, setEntryFee] = useState("");
  const [prize, setPrize] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreate() {
    if (!profile || !name.trim() || !game.trim() || maxParticipants < 2) return;
    if (entryType === "paid" && !entryFee.trim()) return;
    setSubmitError(null);
    try {
      const leagueId = await createLeague.mutateAsync({
        name,
        game,
        description,
        maxParticipants,
        creatorId: profile.uid,
        entryType,
        entryFee: entryType === "paid" ? entryFee.trim() : null,
        prize: prize.trim() || null,
      });
      setOpen(false);
      setName("");
      setGame("");
      setDescription("");
      setMaxParticipants(8);
      setEntryType("free");
      setEntryFee("");
      setPrize("");
      router.push(`/leagues/${leagueId}`);
    } catch {
      setSubmitError("Couldn't create that league. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New league
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>Create a league</DialogTitle>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-name">League name</Label>
            <Input id="l-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday Night League" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-game">Game</Label>
            <select
              id="l-game"
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-desc">Description</Label>
            <Textarea
              id="l-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rules, schedule, anything players should know"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-max">Number of participants</Label>
            <Input
              id="l-max"
              type="number"
              min={2}
              max={20}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Math.max(2, Math.min(20, Number(e.target.value))))}
            />
            <p className="text-xs text-steel/50">
              {maxParticipants >= 2 && (
                <>
                  Each participant plays every other participant twice (home and away) —{" "}
                  <span className="font-medium text-steel/70">
                    {maxParticipants * (maxParticipants - 1)} matches total
                  </span>
                  . Players join once you&apos;ve created the league; you start the schedule yourself once enough have joined.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Entry</Label>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          </div>

          {entryType === "paid" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="l-fee">Entry fee</Label>
              <Input
                id="l-fee"
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
            <Label htmlFor="l-prize">Prize (optional)</Label>
            <Input id="l-prize" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. $100 cash, winner takes all" />
          </div>

          {submitError && <p className="text-sm text-signal-red">{submitError}</p>}
          <Button
            onClick={handleCreate}
            disabled={
              !name.trim() ||
              !game.trim() ||
              maxParticipants < 2 ||
              (entryType === "paid" && !entryFee.trim()) ||
              createLeague.isPending
            }
          >
            {createLeague.isPending ? "Creating…" : "Create league"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
