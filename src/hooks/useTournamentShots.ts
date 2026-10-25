"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { safeName, uploadImage } from "@/lib/firebase/storage-helpers";
import type { PostAuthorSnapshot, TournamentShot } from "@/types";

/** Live list of screenshots for one tournament, newest first. */
export function useTournamentShots(tournamentId: string) {
  const [shots, setShots] = useState<TournamentShot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    return onSnapshot(
      query(collection(db, "tournaments", tournamentId, "shots"), orderBy("createdAt", "desc"), limit(60)),
      (snap) => {
        setShots(snap.docs.map((d) => ({ id: d.id, tournamentId, ...d.data() } as TournamentShot)));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [tournamentId]);

  return { shots, loading };
}

export function useAddShot(tournamentId: string) {
  return useMutation({
    mutationFn: async (input: { file: File; caption: string; author: PostAuthorSnapshot }) => {
      const imageUrl = await uploadImage(
        `tournaments/${tournamentId}/${input.author.uid}/${Date.now()}-${safeName(input.file.name)}`,
        input.file
      );
      await addDoc(collection(db, "tournaments", tournamentId, "shots"), {
        authorId: input.author.uid,
        author: input.author,
        imageUrl,
        caption: input.caption.trim().slice(0, 140),
        createdAt: serverTimestamp(),
      });
    },
  });
}

export function useDeleteShot(tournamentId: string) {
  return useMutation({
    mutationFn: async (shotId: string) => {
      await deleteDoc(doc(db, "tournaments", tournamentId, "shots", shotId));
    },
  });
}
