"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ImagePlus, Trash2 } from "lucide-react";
import { useAdminAds, useCreateAd, useDeleteAd, useSetAdActive } from "@/hooks/useAds";
import { useAuth } from "@/providers/AuthProvider";
import { safeName, uploadImage, validateImageFile } from "@/lib/firebase/storage-helpers";
import type { Ad } from "@/types";
import { AdCard } from "@/components/ads/AdCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PLACEMENTS: { value: Ad["placement"]; label: string }[] = [
  { value: "feed", label: "Feed" },
  { value: "tournaments", label: "Tournaments page" },
  { value: "both", label: "Both" },
];

export default function AdminAdsPage() {
  const { profile } = useAuth();
  const { data: ads, isLoading } = useAdminAds();
  const createAd = useCreateAd();
  const setActive = useSetAdActive();
  const deleteAd = useDeleteAd();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sponsor, setSponsor] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Learn more");
  const [placement, setPlacement] = useState<Ad["placement"]>("feed");
  const [endsOn, setEndsOn] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    const err = validateImageFile(file);
    if (err) return setError(err);
    setError(null);
    setUploading(true);
    try {
      setImageUrl(await uploadImage(`ads/${profile.uid}/${Date.now()}-${safeName(file.name)}`, file));
    } catch (e: any) {
      setError(e?.message || "Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sponsor.trim() || !title.trim()) return setError("Add the sponsor's name and a headline.");
    if (!/^https:\/\//i.test(linkUrl.trim())) return setError("The link must start with https://");
    try {
      await createAd.mutateAsync({
        sponsor: sponsor.trim(),
        title: title.trim(),
        text: text.trim(),
        imageUrl,
        linkUrl: linkUrl.trim(),
        ctaLabel: ctaLabel.trim() || "Learn more",
        placement,
        endsOn,
      });
      setSponsor("");
      setTitle("");
      setText("");
      setLinkUrl("");
      setCtaLabel("Learn more");
      setImageUrl(null);
      setEndsOn("");
    } catch {
      setError("Couldn't save the ad — make sure the latest Firestore rules are published.");
    }
  }

  const preview: Ad = {
    id: "preview",
    sponsor: sponsor || "Sponsor name",
    title: title || "Your headline here",
    text,
    imageUrl,
    linkUrl: linkUrl || "https://",
    ctaLabel: ctaLabel || "Learn more",
    placement,
    active: true,
    endsAt: null,
    impressions: 0,
    clicks: 0,
    createdAt: null as any,
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Ads</h1>
        <p className="text-sm text-steel/50">Sponsored cards shown in the feed (after every 5th post) and on the Tournaments page.</p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">New ad</p>
          <div className="flex flex-col gap-1.5">
            <Label>Sponsor name</Label>
            <Input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="e.g. GameZone Accra" maxLength={40} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Headline</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20% off all controllers" maxLength={70} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Short text (optional)</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={160} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Link (where the button goes)</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." inputMode="url" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Button text</Label>
              <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={20} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Ends on (optional)</Label>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Where to show it</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLACEMENTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlacement(p.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    placement === p.value ? "border-violet bg-violet/15 text-violet-glow" : "border-border text-steel/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImagePlus className="mr-1.5 h-4 w-4" />
              {uploading ? "Uploading…" : imageUrl ? "Change image" : "Add image"}
            </Button>
            {imageUrl && (
              <button type="button" className="text-xs text-steel/50 underline" onClick={() => setImageUrl(null)}>
                Remove image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          <p className="text-xs text-steel/50">Preview</p>
          <AdCard ad={preview} />

          {error && <p className="text-xs text-signal-red">{error}</p>}
          <Button type="submit" disabled={createAd.isPending || uploading}>
            {createAd.isPending ? "Saving…" : "Publish ad"}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">All ads</p>
        {isLoading && <p className="text-sm text-steel/50">Loading…</p>}
        {!isLoading && !ads?.length && <p className="text-sm text-steel/50">No ads yet.</p>}
        {ads?.map((ad) => {
          const expired = !!ad.endsAt && ad.endsAt.toMillis() < Date.now();
          const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
          return (
            <Card key={ad.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{ad.title}</p>
                  <p className="text-xs text-steel/50">
                    {ad.sponsor} · {ad.placement} ·{" "}
                    {expired ? "Expired" : ad.active ? "Running" : "Paused"}
                    {ad.endsAt && !expired ? ` · ends ${formatDistanceToNow(ad.endsAt.toDate(), { addSuffix: true })}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-xs text-steel/70">
                {ad.impressions} views · {ad.clicks} clicks · {ctr}% click rate
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setActive.mutate({ id: ad.id, active: !ad.active })}>
                  {ad.active ? "Pause" : "Resume"}
                </Button>
                {confirmDelete === ad.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await deleteAd.mutateAsync(ad.id);
                        setConfirmDelete(null);
                      }}
                    >
                      Confirm delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(ad.id)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
