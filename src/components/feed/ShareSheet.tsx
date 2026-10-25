"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { sendTextToThread, useThreads } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Instagram-style share sheet: send to a recent chat, copy the link, WhatsApp, or the phone's share menu. */
export function ShareSheet({
  open,
  onOpenChange,
  path,
  title,
  text,
  onShared,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
  title: string;
  text: string;
  onShared?: () => void;
}) {
  const { profile } = useAuth();
  const { data: threads } = useThreads(profile?.uid);
  const [sent, setSent] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const recent = threads
    .map((t) => {
      const otherId = t.participantIds.find((id) => id !== profile?.uid);
      return otherId ? { thread: t, other: t.participants?.[otherId] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x && !!x.other)
    .slice(0, 12);

  async function sendTo(threadId: string) {
    if (!profile || sent[threadId]) return;
    setSent((s) => ({ ...s, [threadId]: "sending" }));
    try {
      await sendTextToThread(threadId, profile.uid, url);
      setSent((s) => ({ ...s, [threadId]: "sent" }));
      onShared?.();
    } catch {
      setSent((s) => ({ ...s, [threadId]: "error" }));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      onShared?.();
      onOpenChange(false);
    } catch {}
  }

  const canNative = typeof navigator !== "undefined" && !!navigator.share;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text ? text.slice(0, 120) + "\n" : ""}${url}`)}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border border-b-0 border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
          <DialogPrimitive.Title className="py-3 text-center text-sm font-semibold text-foreground">Share</DialogPrimitive.Title>

          <div className="overflow-y-auto px-4 pb-4">
            {recent.length > 0 ? (
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {recent.map(({ thread, other }) => {
                  const state = sent[thread.id];
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => sendTo(thread.id)}
                      disabled={!!state}
                      className="flex flex-col items-center gap-1.5 text-center"
                    >
                      <span className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={other.photoURL ?? undefined} />
                          <AvatarFallback>{other.displayName?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        {state === "sent" && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white">
                            <Check className="h-6 w-6" />
                          </span>
                        )}
                      </span>
                      <span className={cn("w-full truncate text-xs", state === "sent" ? "text-violet-glow" : "text-foreground")}>
                        {state === "sent" ? "Sent" : state === "sending" ? "Sending…" : state === "error" ? "Failed" : other.displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-steel/50">Start a chat with someone and they&apos;ll show up here.</p>
            )}

            <div className="mt-5 flex gap-4 overflow-x-auto border-t border-border pt-4 scrollbar-none">
              <ShareAction onClick={copy} icon={copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />} label={copied ? "Copied" : "Copy link"} />
              <a href={whatsapp} target="_blank" rel="noreferrer" onClick={onShared} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span className="text-xs text-foreground">WhatsApp</span>
              </a>
              {canNative && <ShareAction onClick={nativeShare} icon={<Share2 className="h-5 w-5" />} label="More" />}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ShareAction({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">{icon}</span>
      <span className="text-xs text-foreground">{label}</span>
    </button>
  );
}
