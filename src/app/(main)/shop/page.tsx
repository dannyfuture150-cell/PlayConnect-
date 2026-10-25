"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Play, Plus, Coins, Trash2, Video, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { useAuth } from "@/providers/AuthProvider";
import { callStars, useStars } from "@/hooks/useStars";
import { deleteShopItem, setShopItemSold, SHOP_CATEGORIES, useCreateShopItem, useShopItems, useShopOrders } from "@/hooks/useShop";
import { getOrCreateThread, threadIdFor } from "@/hooks/useMessages";
import { ShopRulesList } from "@/components/shop/ShopRules";
import { RetryVideo } from "@/components/shared/RetryVideo";
import { validateVideoFile } from "@/lib/firebase/storage-helpers";
import { cn } from "@/lib/utils";
import type { ShopCategory, ShopItem, ShopOrder } from "@/types";

const MAX_PHOTOS = 4;

export default function ShopPage() {
  const { profile } = useAuth();
  const { items, loading } = useShopItems();
  const [cat, setCat] = useState<ShopCategory | "all">("all");
  const [open, setOpen] = useState<ShopItem | null>(null);
  const [posting, setPosting] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const orders = useShopOrders(profile?.uid);
  const activeOrders = orders.filter((o) => o.status === "held" || o.status === "delivered");
  const [rules, setRules] = useState(false);

  const shown = items.filter((i) => cat === "all" || i.category === cat);

  return (
    <div className="-mx-4 md:mx-0">
      <div className="flex items-center justify-between px-4 pb-2 pt-1">
        <h1 className="font-display text-2xl font-bold">Shop</h1>
        <div className="flex items-center gap-3">
          {profile && orders.length > 0 && (
            <button type="button" onClick={() => setOrdersOpen(true)} className="relative text-sm font-semibold text-steel/70 underline">
              Orders
              {activeOrders.length > 0 && <span className="ml-1 rounded-full bg-signal-red px-1.5 py-0.5 text-[10px] font-bold text-white no-underline">{activeOrders.length}</span>}
            </button>
          )}
          <button type="button" onClick={() => setRules(true)} className="text-sm font-semibold text-steel/70 underline">
            Rules
          </button>
          {profile && (
            <Button size="sm" onClick={() => setPosting(true)}>
              <Plus className="mr-1 h-4 w-4" /> Sell
            </Button>
          )}
        </div>
      </div>
      <p className="mx-4 mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-steel/70">
        Deals are between the buyer and seller only. PlayConnect doesn&apos;t handle payments or deliveries.{" "}
        <button type="button" onClick={() => setRules(true)} className="font-semibold underline">
          Read the rules
        </button>
      </p>

      <div data-noswipe className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {[{ id: "all", label: "All" }, ...SHOP_CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id as ShopCategory | "all")}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              cat === c.id ? "border-foreground bg-foreground text-background" : "border-border text-steel/70"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-steel/60">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-steel/40" />
          <p className="font-semibold">Nothing here yet</p>
          <p className="text-sm text-steel/60">Be the first to post something for sale.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4 md:gap-3 md:bg-transparent">
          {shown.map((it) => (
            <div key={it.id} className="relative bg-background md:overflow-hidden md:rounded-xl md:border md:border-border">
            {profile?.uid === it.sellerId && !it.reservedBy && (
              <button
                type="button"
                aria-label="Delete item"
                onClick={async () => {
                  if (!confirm(`Delete "${it.title}"? This can't be undone.`)) return;
                  try {
                    await deleteShopItem(it.id);
                  } catch {
                    alert("Couldn't delete that. Try again.");
                  }
                }}
                className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-signal-red/15 text-signal-red active:bg-signal-red active:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(it)}
              className="block w-full text-left"
            >
              <div className="relative aspect-square bg-muted">
                {it.imageUrls[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrls[0]} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                )}
                {it.videoUrl && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white">
                    <Play className="h-3.5 w-3.5 fill-white" />
                  </span>
                )}
                {it.starsPrice ? (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-yellow-300">
                    <Coins className="h-3 w-3" /> {it.starsPrice}
                  </span>
                ) : null}
                {it.reservedBy && !it.sold && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-bold uppercase tracking-wider text-white">Reserved</span>
                )}
                {it.sold && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-center text-xs font-bold uppercase tracking-wider text-white">
                    Sold
                  </span>
                )}
              </div>
              <div className={cn("p-2.5", profile?.uid === it.sellerId && !it.reservedBy && "pr-12")}>
                <p className="text-sm font-bold">
                  {it.currency} {it.price.toLocaleString()}
                </p>
                <p className="line-clamp-1 text-sm text-steel/80">{it.title}</p>
              </div>
            </button>
            </div>
          ))}
        </div>
      )}

      {open && <ItemDialog item={open} onClose={() => setOpen(null)} />}
      {rules && (
        <Dialog open onOpenChange={(o) => !o && setRules(false)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto">
            <DialogTitle>Shop rules</DialogTitle>
            <ShopRulesList />
            <Button className="w-full" onClick={() => setRules(false)}>
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      )}
      {posting && <SellDialog onClose={() => setPosting(false)} />}
      {ordersOpen && profile && <OrdersDialog orders={orders} uid={profile.uid} onClose={() => setOrdersOpen(false)} />}
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: ShopItem; onClose: () => void }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mine = profile?.uid === item.sellerId;
  const myStars = useStars(profile?.uid).balance;
  const canRemove = mine || !!profile?.isAdmin;

  async function message() {
    if (!profile) return;
    setBusy(true);
    setErr(null);
    try {
      const me = { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL };
      await getOrCreateThread(me, item.seller);
      router.push(`/messages/${threadIdFor(profile.uid, item.sellerId)}`);
    } catch {
      setErr("Couldn't open the chat. Try again.");
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onClose();
    } catch {
      setErr("That didn't work. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <div data-noswipe className="flex snap-x snap-mandatory overflow-x-auto bg-muted [scrollbar-width:none]">
          {item.videoUrl && (
            <RetryVideo src={item.videoUrl} controls playsInline preload="metadata" className="aspect-square w-full shrink-0 snap-center bg-black object-contain" />
          )}
          {item.imageUrls.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="aspect-square w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        <div className="space-y-3 px-4 pb-5">
          <div>
            <p className="text-xl font-bold">
              {item.currency} {item.price.toLocaleString()} {item.sold && <span className="text-sm text-signal-red">· Sold</span>}
            </p>
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-steel/60">
              {SHOP_CATEGORIES.find((c) => c.id === item.category)?.label}
              {item.location ? ` · ${item.location}` : ""}
            </p>
          </div>
          {item.description && <p className="whitespace-pre-wrap text-sm text-steel/80">{item.description}</p>}
          <Link href={`/profile/${item.seller.username}`} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={item.seller.photoURL ?? undefined} />
              <AvatarFallback>{item.seller.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{item.seller.displayName}</span>
            <VerifiedTick uid={item.sellerId} />
          </Link>
          <p className="rounded-lg bg-muted p-2.5 text-xs text-steel/70">
            This deal is only between you and the seller. PlayConnect doesn&apos;t hold payments, deliver items or take responsibility for the sale. Never pay in full before you&apos;ve seen the item.
          </p>
          {err && <p className="text-sm text-signal-red">{err}</p>}
          {item.starsPrice && !item.sold ? (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p className="flex items-center gap-1 font-bold text-yellow-500">
                <Coins className="h-4 w-4 text-yellow-400" /> {item.starsPrice} PlayCoins also accepted
              </p>
              {item.reservedBy ? (
                <p className="text-xs text-steel/70">{item.reservedBy === profile?.uid ? "You've paid for this. Check Orders on the Shop page." : "Someone has already paid for this with PlayCoins."}</p>
              ) : !mine && profile ? (
                <>
                  <p className="text-xs text-steel/70">
                    Your PlayCoins are held until you confirm you got the item. You have {myStars} 🪙.
                  </p>
                  <Button
                    className="w-full"
                    disabled={busy || myStars < item.starsPrice}
                    onClick={async () => {
                      if (!confirm(`Pay ${item.starsPrice} PlayCoins for this item?`)) return;
                      setBusy(true);
                      setErr(null);
                      const r = await callStars({ action: "shopBuy", itemId: item.id });
                      setBusy(false);
                      if (r.ok) onClose();
                      else setErr(r.error ?? "That didn't work.");
                    }}
                  >
                    {myStars < item.starsPrice ? `Need ${item.starsPrice - myStars} more 🪙` : `Pay ${item.starsPrice} 🪙 PlayCoins`}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          {!mine && profile && !item.sold && (
            <Button className="w-full" variant={item.starsPrice ? "outline" : "default"} disabled={busy} onClick={message}>
              Message seller
            </Button>
          )}
          {mine && !item.reservedBy && (
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(() => setShopItemSold(item.id, !item.sold))}>
              {item.sold ? "Mark as available" : "Mark as sold"}
            </Button>
          )}
          {canRemove && !item.reservedBy && (
            <Button
              variant="outline"
              className="w-full text-signal-red"
              disabled={busy}
              onClick={() => confirm("Delete this listing?") && run(() => deleteShopItem(item.id))}
            >
              Delete listing
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SellDialog({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const create = useCreateShopItem();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [starsPrice, setStarsPrice] = useState("");
  const [category, setCategory] = useState<ShopCategory>("accounts");
  const [location, setLocation] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [agreed, setAgreed] = useState(false);
  const [showRules, setShowRules] = useState(false);

  function pick(list: FileList | null) {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list)].slice(0, MAX_PHOTOS));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pickVideo(list: FileList | null) {
    const f = list?.[0];
    if (videoRef.current) videoRef.current.value = "";
    if (!f) return;
    const e = await validateVideoFile(f, 180);
    if (e) return setErr(e);
    setErr(null);
    setVideo(f);
  }

  async function submit() {
    if (!profile) return;
    if (!agreed) return setErr("Please agree to the shop rules.");
    const n = Number(price);
    if (title.trim().length < 3) return setErr("Add a title.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter a price.");
    if (files.length === 0) return setErr("Add at least one photo.");
    setErr(null);
    try {
      await create.mutateAsync({
        seller: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
        title: title.trim(),
        description: desc.trim(),
        price: n,
        starsPrice: Number(starsPrice) >= 1 ? Math.min(100000, Math.round(Number(starsPrice))) : null,
        category,
        location: location.trim(),
        images: files,
        video,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message || "Couldn't post. Try again.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !create.isPending && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogTitle>Sell something</DialogTitle>
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {files.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-steel/60"
              >
                <ImagePlus className="h-5 w-5" /> Photo
              </button>
            )}
          </div>
          <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => pickVideo(e.target.files)} />
          {video ? (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2"><Video className="h-4 w-4 shrink-0" /><span className="truncate">{video.name}</span></span>
              <button type="button" aria-label="Remove video" onClick={() => setVideo(null)}><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => videoRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-sm text-steel/60">
              <Video className="h-4 w-4" /> Add a video (optional, up to 3 min)
            </button>
          )}
          <Input placeholder="What are you selling?" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Price (GH₵)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
          <div className="space-y-1">
            <Input placeholder="Also accept PlayCoins? Price in 🪙 (optional)" inputMode="numeric" value={starsPrice} onChange={(e) => setStarsPrice(e.target.value.replace(/\D/g, ""))} />
            <p className="text-[11px] text-steel/60">Buyers' PlayCoins are held until they confirm they got the item, then you receive them minus a 10% fee.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SHOP_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm",
                  category === c.id ? "border-foreground bg-foreground text-background" : "border-border text-steel/70"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Input placeholder="Location (optional)" value={location} maxLength={60} onChange={(e) => setLocation(e.target.value)} />
          <Textarea placeholder="Describe it (condition, what's included…)" value={desc} maxLength={1000} rows={4} onChange={(e) => setDesc(e.target.value)} />
          <label className="flex items-start gap-2 text-sm text-steel/80">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              I understand this sale is only between me and the buyer, and I agree to the{" "}
              <button type="button" onClick={() => setShowRules((v) => !v)} className="font-semibold underline">
                shop rules
              </button>
              .
            </span>
          </label>
          {showRules && <ShopRulesList className="list-decimal space-y-1.5 rounded-lg bg-muted p-3 pl-8 text-xs text-steel/80" />}
          {err && <p className="text-sm text-signal-red">{err}</p>}
          <Button className="w-full" disabled={create.isPending} onClick={submit}>
            {create.isPending ? "Posting…" : "Post item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrdersDialog({ orders, uid, onClose }: { orders: ShopOrder[]; uid: string; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function act(id: string, action: "shopDeliver" | "shopConfirm" | "shopCancel", ask?: string) {
    if (ask && !confirm(ask)) return;
    setBusy(id + action);
    setErr(null);
    const r = await callStars({ action, orderId: id });
    if (!r.ok) setErr(r.error ?? "That didn't work.");
    setBusy(null);
  }
  const label = { held: "Paid · waiting for delivery", delivered: "Delivered · waiting for confirmation", released: "Completed", cancelled: "Cancelled · refunded" } as const;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogTitle>PlayCoins orders</DialogTitle>
        {err && <p className="text-sm text-signal-red">{err}</p>}
        <div className="space-y-3">
          {orders.map((o) => {
            const iAmBuyer = o.buyerId === uid;
            const other = iAmBuyer ? o.seller : o.buyer;
            const open = o.status === "held" || o.status === "delivered";
            return (
              <div key={o.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{o.itemTitle}</p>
                    <p className="text-xs text-steel/60">
                      {iAmBuyer ? "You bought from" : "Sold to"} {other.displayName} · {o.price} 🪙
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] font-semibold text-steel/70">{label[o.status]}</span>
                </div>
                {open && (
                  <div className="flex flex-wrap gap-2">
                    {!iAmBuyer && o.status === "held" && (
                      <Button size="sm" disabled={!!busy} onClick={() => act(o.id, "shopDeliver", "Mark this as delivered to the buyer?")}>Mark delivered</Button>
                    )}
                    {iAmBuyer && (
                      <Button size="sm" disabled={!!busy} onClick={() => act(o.id, "shopConfirm", `Release ${o.price} 🪙 to the seller? Only do this once you have the item.`)}>I got it</Button>
                    )}
                    {(iAmBuyer ? o.status === "held" : true) && (
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(o.id, "shopCancel", "Cancel this order and refund the buyer?")}>
                        {iAmBuyer ? "Cancel & refund" : "Cancel order"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-steel/60">
          After the seller marks an order delivered, the PlayCoins are released automatically in 3 days if the buyer doesn&apos;t answer.
        </p>
      </DialogContent>
    </Dialog>
  );
}
