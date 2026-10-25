"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { TournamentMatch } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useSubmitResult } from "@/hooks/useMatchResults";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubmitResultDialog({
  match, tournamentId, tournamentTitle, organizerId,
}: { match: TournamentMatch; tournamentId: string; tournamentTitle: string; organizerId: string }) {
  const { profile } = useAuth();
  const submit = useSubmitResult(tournamentId, tournamentTitle, organizerId);
  const [open, setOpen] = useState(false);
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const n1 = Number(s1), n2 = Number(s2);
  const valid = s1 !== "" && s2 !== "" && n1 !== n2 && !!file;

  async function send() {
    if (!profile || !file) return;
    setError(null);
    try {
      await submit.mutateAsync({
        match, player1Score: n1, player2Score: n2, image: file,
        submitter: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
      });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setS1(""); setS2(""); setFile(null); }, 1500);
    } catch (e: any) {
      setError(e?.message?.includes("permission") ? "Not allowed — publish the latest Firestore rules." : e?.message || "Couldn't send. Try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="mt-2 w-full">Submit result</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Submit your result</DialogTitle>
        <p className="mt-1 text-xs text-steel/60">Enter the final score and attach a screenshot as proof. The organiser will check it.</p>
        <div className="mt-4 flex flex-col gap-3">
          {[{ p: match.player1, v: s1, set: setS1 }, { p: match.player2, v: s2, set: setS2 }].map(({ p, v, set }, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">{p?.displayName ?? "Player"}</span>
              <Input type="number" min={0} value={v} onChange={(e) => set(e.target.value)} className="h-10 w-20 text-center" />
            </div>
          ))}
          {s1 !== "" && s1 === s2 && <p className="text-xs text-signal-red">Scores can&apos;t tie in a knockout match.</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted p-4 text-sm text-steel/70"
          >
            <ImagePlus className="h-4 w-4" /> {file ? file.name : "Attach screenshot (required)"}
          </button>
          {error && <p className="text-sm text-signal-red">{error}</p>}
          {done && <p className="text-sm text-signal-green">Sent! Waiting for the organiser.</p>}
          <Button onClick={send} disabled={!valid || submit.isPending || done}>
            {submit.isPending ? "Sending…" : "Send to organiser"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
