"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, getDocs, increment, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Ad } from "@/types";

const isLive = (a: Ad) => a.active && (!a.endsAt || a.endsAt.toMillis() > Date.now());

/** Ads currently running for a placement. Filtered client-side (no composite index needed) and cached for a few minutes. */
export function useActiveAds(placement: "feed" | "tournaments") {
  return useQuery<Ad[]>({
    queryKey: ["ads", "active"],
    queryFn: async () => {
      const snap = await getDocs(adsQuery());
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ad)).filter(isLive);
    },
    staleTime: 5 * 60 * 1000,
    select: (ads) => ads.filter((a) => a.placement === placement || a.placement === "both"),
  });
}

/** Newest ads first, capped — one simple sort, so no composite index is needed. */
function adsQuery() {
  return query(collection(db, "ads"), orderBy("createdAt", "desc"), limit(100));
}

const seen = new Set<string>();

/** Count one view per ad per app session. */
export function trackAdImpression(adId: string) {
  if (seen.has(adId)) return;
  seen.add(adId);
  updateDoc(doc(db, "ads", adId), { impressions: increment(1) }).catch(() => {});
}

export function trackAdClick(adId: string) {
  updateDoc(doc(db, "ads", adId), { clicks: increment(1) }).catch(() => {});
}

/** Admin: every ad, including paused/expired ones. */
export function useAdminAds() {
  return useQuery<Ad[]>({
    queryKey: ["ads", "admin"],
    queryFn: async () => {
      const snap = await getDocs(adsQuery());
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ad));
    },
  });
}

export type AdInput = {
  sponsor: string;
  title: string;
  text: string;
  imageUrl: string | null;
  linkUrl: string;
  ctaLabel: string;
  placement: Ad["placement"];
  endsOn: string; // yyyy-mm-dd or ""
};

export function useCreateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdInput) => {
      const { endsOn, ...rest } = input;
      await addDoc(collection(db, "ads"), {
        ...rest,
        active: true,
        endsAt: endsOn ? Timestamp.fromDate(new Date(`${endsOn}T23:59:59`)) : null,
        impressions: 0,
        clicks: 0,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads"] }),
  });
}

export function useSetAdActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      await updateDoc(doc(db, "ads", input.id), { active: input.active });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads"] }),
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "ads", id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ads"] }),
  });
}
