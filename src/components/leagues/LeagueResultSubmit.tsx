"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { LeagueMatch } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useSubmitLeagueResult } from "@/hooks/useLeagueResults";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LeagueResultSubmit({ leagueId, creatorId, match }: { leagueId: string; creatorId: string; match: LeagueMatch }) {
  const { profile } = useAuth();
  const submit = useSubmitLeagueResult(leagueId, creatorId);
  const [open, setOpen] = useState(false);
  const [h, setH] = useState("");
  const [a, setA] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const valid = h !== "" && a !== "" && !!file;

  async function send() {
    if (!profile || !file) return;
    setError(null);
    try {
      await submit.mutateAsync({
        match, homeScore: Number(h), awayScore: Number(a), image: file,
        submitter: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
      });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setH(""); setA(""); setFile(null); }, 1500);
    } catch (e: any) {
      setError(e?.message?.includes("permission") ? "Not allowed — publish the latest Firestore rules." : e?.message || "Couldn't send. Try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">Submit result</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Submit your result</DialogTitle>
        <p className="mt-1 text-xs text-steel/60">Enter the final score and attach a screenshot as proof. The organiser will check it.</p>
        <div className="mt-4 flex flex-col gap-3">
          {[{ n: match.homeTeamName, v: h, set: setH }, { n: match.awayTeamName, v: a, set: setA }].map(({ n, v, set }, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">{n}</span>
              <Input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} className="h-10 w-20 text-center" />
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted p-4 text-sm text-steel/70">
            <ImagePlus className="h-4 w-4" /> {file ? file.name : "Attach screenshot (required)"}
          </button>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          {done && <p className="text-sm text-signal-green">Sent! Waiting for the organiser.</p>}
          <Button onClick={send} disabled={!valid || submit.isPending || done}>{submit.isPending ? "Sending…" : "Send to organiser"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
