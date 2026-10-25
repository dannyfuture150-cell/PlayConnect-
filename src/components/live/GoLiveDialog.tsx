"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { startLive } from "@/hooks/useLive";
import { parseLiveUrl, PLATFORM_LABEL } from "@/lib/liveEmbed";
import { LEADERBOARD_GAMES } from "@/lib/leaderboardGames";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GoLiveDialog({ label = "Go live" }: { label?: string }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseLiveUrl(link);

  async function handleStart() {
    if (!profile || busy) return;
    if (!title.trim()) return setError("Give your stream a title.");
    if (!parsed) return setError("Paste the link to your live stream.");
    setBusy(true);
    setError(null);
    try {
      const id = await startLive({
        host: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
        title: title.trim().slice(0, 80),
        game,
        platform: parsed.platform,
        url: parsed.url,
        ref: parsed.ref,
      });
      setOpen(false);
      setTitle("");
      setGame("");
      setLink("");
      router.push(`/live/${id}`);
    } catch {
      setError("Couldn't start that stream. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Radio className="h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>Share your live stream</DialogTitle>
        <p className="mt-1 text-xs text-steel/50">
          Start your live on YouTube, Twitch or Facebook first, then paste its link here. Everyone on PlayConnect can
          watch it and chat.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="live-title">Title</Label>
            <Input id="live-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid week cup final 🔥" maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="live-game">Game (optional)</Label>
            <select
              id="live-game"
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
            <Label htmlFor="live-link">Live link</Label>
            <Input id="live-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/live/…" inputMode="url" />
            {parsed && (
              <p className="text-xs text-steel/50">
                {PLATFORM_LABEL[parsed.platform]} link detected
                {parsed.platform === "tiktok" || parsed.platform === "other"
                  ? " — viewers will tap a button to watch it in that app."
                  : " — it will play right inside PlayConnect."}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          <Button onClick={handleStart} disabled={busy}>
            {busy ? "Starting…" : "Go live"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
