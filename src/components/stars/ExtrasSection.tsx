"use client";

import { useRef, useState } from "react";
import { Check, Coins, ImagePlus } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { callStars, useStars } from "@/hooks/useStars";
import { CHAT_BUBBLES, CHAT_WALLPAPERS, PROFILE_BGS, UNLOCKS } from "@/lib/starsCatalog";
import { safeName, uploadImage, validateImageFile } from "@/lib/firebase/storage-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The 200 🪙 extras: Chat Customiser and Profile Background, with their pickers once unlocked. */
export function ExtrasSection() {
  const { profile } = useAuth();
  const stars = useStars(profile?.uid);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  async function run(key: string, fn: () => ReturnType<typeof callStars>) {
    setBusy(key);
    setMsg(null);
    const r = await fn();
    if (!r.ok) setMsg(r.error ?? "That didn't work.");
    setBusy(null);
  }

  async function pickPhoto(file?: File) {
    if (!file || !profile) return;
    const err = validateImageFile(file);
    if (err) return setMsg(err);
    setBusy("bgphoto");
    setMsg(null);
    try {
      const url = await uploadImage(`banners/${profile.uid}/bg-${Date.now()}-${safeName(file.name)}`, file);
      const r = await callStars({ action: "setProfileBg", bgType: "image", bgValue: url });
      if (!r.ok) setMsg(r.error ?? "That didn't work.");
    } catch (e) {
      setMsg((e as Error).message || "Couldn't upload that photo.");
    }
    setBusy(null);
  }

  const chat = stars.chat ?? {};
  const bg = stars.profileBg;
  const ownsChat = stars.owned.includes("unlock_chat");
  const ownsBg = stars.owned.includes("unlock_profilebg");

  return (
    <section id="extras" className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-xl font-bold">Extras</h2>
      {msg && <p className="mt-2 text-sm text-signal-red">{msg}</p>}

      {UNLOCKS.map((u) => {
        const owned = stars.owned.includes(u.id);
        return (
          <div key={u.id} className="mt-4 border-t border-border pt-4 first:mt-3 first:border-0 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">{u.name}</p>
                <p className="text-xs text-steel/60">{u.desc}</p>
              </div>
              {owned ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-500"><Check className="h-4 w-4" /> Unlocked</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={busy === u.id || stars.balance < u.price}
                  onClick={() => run(u.id, () => callStars({ action: "redeem", itemId: u.id }))}
                >
                  {stars.balance < u.price ? `Need ${u.price - stars.balance} more` : <>Unlock · {u.price} <Coins className="ml-1 h-4 w-4 text-yellow-400" /></>}
                </Button>
              )}
            </div>

            {u.id === "unlock_chat" && ownsChat && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel/60">Your chat bubbles</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CHAT_BUBBLES).map(([id, b]) => (
                      <button
                        key={id}
                        type="button"
                        title={b.name}
                        disabled={busy === "chat"}
                        onClick={() => run("chat", () => callStars({ action: "setChatStyle", bubble: chat.bubble === id ? null : id, wallpaper: chat.wallpaper ?? null }))}
                        className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2", chat.bubble === id ? "border-foreground" : "border-transparent")}
                        style={{ backgroundImage: b.bg }}
                      >
                        {chat.bubble === id && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel/60">Chat wallpaper (only you see this)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(CHAT_WALLPAPERS).map(([id, w]) => (
                      <button
                        key={id}
                        type="button"
                        disabled={busy === "chat"}
                        onClick={() => run("chat", () => callStars({ action: "setChatStyle", bubble: chat.bubble ?? null, wallpaper: chat.wallpaper === id ? null : id }))}
                        className={cn("flex h-14 items-end justify-center rounded-xl border-2 pb-1 text-[10px] font-semibold text-white", chat.wallpaper === id ? "border-foreground" : "border-transparent")}
                        style={w.style}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* live preview */}
                <div className="rounded-xl p-3" style={chat.wallpaper ? CHAT_WALLPAPERS[chat.wallpaper]?.style : { background: "#0b0f1a" }}>
                  <div className="ml-auto w-fit max-w-[70%] rounded-2xl rounded-tr-sm px-3 py-1.5 text-sm text-white" style={{ backgroundImage: chat.bubble ? CHAT_BUBBLES[chat.bubble]?.bg : CHAT_BUBBLES.violet.bg }}>
                    Good game! 🔥
                  </div>
                </div>
              </div>
            )}

            {u.id === "unlock_profilebg" && ownsBg && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(PROFILE_BGS).map(([id, b]) => (
                    <button
                      key={id}
                      type="button"
                      disabled={busy === "bg"}
                      onClick={() => run("bg", () => callStars({ action: "setProfileBg", bgType: "preset", bgValue: id }))}
                      className={cn("flex h-14 items-end justify-center rounded-xl border-2 pb-1 text-[10px] font-semibold text-white", bg?.type === "preset" && bg.value === id ? "border-foreground" : "border-transparent")}
                      style={b.style}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy === "bgphoto"} onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="mr-1.5 h-4 w-4" /> {busy === "bgphoto" ? "Uploading…" : bg?.type === "image" ? "Change my photo" : "Use my own photo"}
                  </Button>
                  {bg && (
                    <Button size="sm" variant="ghost" disabled={busy === "bg"} onClick={() => run("bg", () => callStars({ action: "setProfileBg", bgType: "none" }))}>
                      Remove
                    </Button>
                  )}
                </div>
                {bg?.type === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bg.value} alt="" className="h-20 w-full rounded-xl object-cover" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
