"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { callStars } from "@/hooks/useStars";
import { STAR_RULES } from "@/lib/starsCatalog";
import { safeName, uploadImage, validateImageFile, validateVideoFile } from "@/lib/firebase/storage-helpers";
import type { PostAuthorSnapshot, ShopCategory, ShopItem, ShopOrder } from "@/types";

export const SHOP_CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "accounts", label: "Accounts" },
  { id: "coins", label: "Coins" },
  { id: "consoles", label: "Consoles" },
  { id: "controllers", label: "Controllers" },
  { id: "accessories", label: "Accessories" },
  { id: "other", label: "Other" },
];

/** Live list of shop items, newest first. */
export function useShopItems() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "shopItems"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopItem)));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);
  return { items, loading };
}

export function useCreateShopItem() {
  return useMutation({
    mutationFn: async (input: {
      seller: PostAuthorSnapshot;
      title: string;
      description: string;
      price: number;
      starsPrice?: number | null;
      category: ShopCategory;
      location: string;
      images: File[];
      video?: File | null;
    }) => {
      // Check the listing fee BEFORE uploading anything, so nobody waits through uploads just to be refused.
      try {
        const bal = (await getDoc(doc(db, "stars", input.seller.uid))).data()?.balance ?? 0;
        if (bal < STAR_RULES.sellFee) throw new Error(`Posting something for sale costs ${STAR_RULES.sellFee} PlayCoins. You have ${bal}.`);
      } catch (e) {
        if ((e as Error).message.startsWith("Posting")) throw e;
      }
      const urls: string[] = [];
      let videoUrl: string | null = null;
      if (input.video) {
        const verr = await validateVideoFile(input.video, 180);
        if (verr) throw new Error(verr);
        videoUrl = await uploadImage(`shop/${input.seller.uid}/${Date.now()}-${safeName(input.video.name)}`, input.video);
      }
      for (const f of input.images) {
        const err = validateImageFile(f);
        if (err) throw new Error(err);
        urls.push(await uploadImage(`shop/${input.seller.uid}/${Date.now()}-${safeName(f.name)}`, f));
      }
      // The listing is created on the server, which also takes the listing fee in PlayCoins.
      const r = await callStars({
        action: "shopCreate",
        data: {
          title: input.title,
          description: input.description,
          price: input.price,
          starsPrice: input.starsPrice ?? null,
          category: input.category,
          location: input.location,
          imageUrls: urls,
          ...(videoUrl ? { videoUrl } : {}),
        },
      });
      if (!r.ok) throw new Error(r.error || "Couldn't post. Try again.");
    },
  });
}

export const setShopItemSold = (id: string, sold: boolean) => updateDoc(doc(db, "shopItems", id), { sold });
export const deleteShopItem = (id: string) => deleteDoc(doc(db, "shopItems", id));

/** Live PlayCoins orders the player is part of (as buyer or seller). */
export function useShopOrders(uid: string | undefined) {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "shopOrders"), where("participantIds", "array-contains", uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopOrder));
        list.sort((a, b) => ((b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0) - ((a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0));
        setOrders(list);
      },
      () => undefined
    );
  }, [uid]);
  return orders;
}
