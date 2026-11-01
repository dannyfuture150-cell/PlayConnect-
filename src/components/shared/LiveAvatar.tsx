"use client";

import { AvatarImage } from "@/components/ui/avatar";
import { useLiveAuthor } from "@/hooks/useProfile";

const BOT_UID = "playconnect-bot";

/** A profile picture that follows the player's current photo, so changed pictures show up without opening the chat first. */
export function LiveAvatarImage({ uid, src, alt }: { uid: string | undefined; src?: string | null; alt?: string }) {
  const { data } = useLiveAuthor(uid && uid !== BOT_UID ? uid : undefined);
  return <AvatarImage src={data?.photoURL ?? src ?? undefined} alt={alt} />;
}

/** A player's current display name, falling back to the one saved with the message until it loads. */
export function LiveName({ uid, name }: { uid: string | undefined; name: string }) {
  const { data } = useLiveAuthor(uid && uid !== BOT_UID ? uid : undefined);
  return <>{data?.displayName || name}</>;
}
