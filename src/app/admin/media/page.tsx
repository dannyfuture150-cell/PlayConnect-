"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

interface Reply {
  ok: boolean;
  done?: boolean;
  error?: string;
  code?: unknown;
  group?: string;
  reads?: number;
  docsChanged?: number;
  found?: number;
  moved?: number;
  missing?: number;
  samples?: string[];
  bucketFiles?: number;
  next?: { group: number; after?: string };
}

const ZERO = { reads: 0, docs: 0, found: 0, moved: 0, missing: 0, files: 0 };

export default function MoveMediaPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState<null | "scan" | "apply">(null);
  const [group, setGroup] = useState("");
  const [tot, setTot] = useState(ZERO);
  const [samples, setSamples] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const stop = useRef(false);

  async function run(action: "scan" | "apply") {
    if (!user) return;
    if (action === "apply" && !window.confirm("Replace the old Cloudinary links with the R2 copies now?")) return;
    stop.current = false;
    setRunning(action);
    setMsg(null);
    setSamples([]);
    setTot(ZERO);
    let next: { group: number; after?: string } | undefined = { group: 0 };
    const t = { ...ZERO };
    const seen: string[] = [];
    try {
      while (next && !stop.current) {
        const res: Response = await fetch("/api/admin/move-media", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
          body: JSON.stringify({ action, group: next.group, after: next.after }),
        });
        const r = (await res.json()) as Reply;
        if (!r.ok) {
          setMsg(`${r.error ?? "Something went wrong."}${r.code ? ` (code ${String(r.code)})` : ""} Run it again to continue; finished parts are already saved.`);
          setRunning(null);
          return;
        }
        if (r.done) break;
        t.reads += r.reads ?? 0;
        t.docs += r.docsChanged ?? 0;
        t.found += r.found ?? 0;
        t.moved += r.moved ?? 0;
        t.missing += r.missing ?? 0;
        t.files = r.bucketFiles ?? t.files;
        for (const s of r.samples ?? []) if (seen.length < 6) seen.push(s);
        setGroup(r.group ?? "");
        setTot({ ...t });
        setSamples([...seen]);
        next = r.next;
      }
      setMsg(stop.current ? "Stopped." : action === "scan" ? "Scan finished. Nothing was changed." : "Done. Old posts now use the R2 copies.");
    } catch {
      setMsg("Lost connection. Run it again to continue.");
    }
    setRunning(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Move old media to R2</h1>
        <p className="text-sm text-steel/50">
          Finds posts, avatars, stories, chats and more that still use Cloudinary links and points them at the copy already in R2. Links with no R2 copy are left untouched.
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Button disabled={!!running} onClick={() => run("scan")}>
            {running === "scan" && <Loader2 className="h-4 w-4 animate-spin" />} 1. Scan (changes nothing)
          </Button>
          <Button variant="outline" disabled={!!running} onClick={() => run("apply")}>
            {running === "apply" && <Loader2 className="h-4 w-4 animate-spin" />} 2. Move links
          </Button>
          {running && (
            <Button variant="ghost" onClick={() => (stop.current = true)}>
              Stop
            </Button>
          )}
        </div>
        {running && <p className="text-xs text-steel/60">Working on: {group || "starting"}…</p>}
        {msg && <p className="text-sm font-semibold text-foreground">{msg}</p>}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>Files in R2: <b>{tot.files}</b></p>
          <p>Records read: <b>{tot.reads}</b></p>
          <p>Old links found: <b>{tot.found}</b></p>
          <p>Have an R2 copy: <b className="text-emerald-500">{tot.moved}</b></p>
          <p>No R2 copy: <b className="text-amber-500">{tot.missing}</b></p>
          <p>Records to change: <b>{tot.docs}</b></p>
        </div>
        {samples.length > 0 && (
          <div className="text-[11px] text-steel/60">
            <p className="font-semibold">Links with no R2 copy (examples):</p>
            {samples.map((s) => (
              <p key={s} className="break-all">{s}</p>
            ))}
          </div>
        )}
      </Card>
      <p className="text-xs text-steel/50">Reading every record uses your daily Firestore quota. If it stops with code 8, wait until the quota resets and run it again. It is safe to repeat.</p>
    </div>
  );
}
