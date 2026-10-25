"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { format } from "date-fns";
import { Trophy, Users } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { ChallengeList } from "@/components/challenges/ChallengeList";
import { InviteButton } from "@/components/shared/InviteButton";
import { useSavedPosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/feed/PostCard";
import type { Community, Tournament } from "@/types";
import { Card } from "@/components/ui/card";

function Section({ title, children, empty, href, cta }: { title: string; children: React.ReactNode; empty: boolean; href: string; cta: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">{title}</h2>
      {empty ? (
        <Card className="flex items-center justify-between gap-3 p-4 text-sm text-steel/60">
          Nothing here yet.
          <Link href={href} className="font-semibold text-violet-glow">{cta}</Link>
        </Card>
      ) : (
        children
      )}
    </section>
  );
}

export default function MyStuffPage() {
  const { profile } = useAuth();
  const uid = profile?.uid;

  const joined = useQuery<Tournament[]>({
    queryKey: ["my-tournaments", uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "tournaments"), where("participantIds", "array-contains", uid as string), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
    },
  });
  const organised = useQuery<Tournament[]>({
    queryKey: ["my-organised", uid],
    enabled: !!uid && profile?.accountType === "organizer",
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "tournaments"), where("organizerId", "==", uid as string), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
    },
  });
  const groups = useQuery<Community[]>({
    queryKey: ["my-groups", uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "communities"), where("memberIds", "array-contains", uid as string), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Community));
    },
  });

  const saved = useSavedPosts(profile?.savedPostIds);

  const sortT = (list: Tournament[] = []) =>
    [...list].sort((a, b) => {
      const rank = (t: Tournament) => (effectiveStatus(t) === "live" ? 0 : effectiveStatus(t) === "upcoming" ? 1 : 2);
      return rank(a) - rank(b) || (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0);
    });

  const TournamentRow = ({ t }: { t: Tournament }) => (
    <Link href={`/tournaments/${t.id}`}>
      <Card className="flex items-center gap-3 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white"><Trophy className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
          <p className="truncate text-xs text-steel/50">{t.game} · {t.startsAt ? format(t.startsAt.toDate(), "MMM d, h:mm a") : "TBD"}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${effectiveStatus(t) === "live" ? "bg-signal-red/15 text-signal-red" : "bg-muted text-steel/60"}`}>{effectiveStatus(t)}</span>
      </Card>
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">My stuff</h1>
        <p className="text-sm text-steel/50">Your tournaments, groups and saved posts in one place.</p>
      </div>

      <InviteButton />

      <ChallengeList />

      <Section title="My tournaments" empty={!joined.isLoading && (joined.data?.length ?? 0) === 0} href="/tournaments" cta="Find one to join">
        <div className="flex flex-col gap-2">{sortT(joined.data).map((t) => <TournamentRow key={t.id} t={t} />)}</div>
      </Section>

      {profile?.accountType === "organizer" && (
        <Section title="Tournaments I run" empty={!organised.isLoading && (organised.data?.length ?? 0) === 0} href="/tournaments" cta="Create one">
          <div className="flex flex-col gap-2">{sortT(organised.data).map((t) => <TournamentRow key={t.id} t={t} />)}</div>
        </Section>
      )}

      <Section title="My groups" empty={!groups.isLoading && (groups.data?.length ?? 0) === 0} href="/communities" cta="Find a group">
        <div className="flex flex-col gap-2">
          {(groups.data ?? []).map((c) => (
            <Link key={c.id} href={`/communities/${c.slug}`}>
              <Card className="flex items-center gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-steel/60"><Users className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-steel/50">{c.game} · {c.memberCount} members</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Saved posts" empty={!saved.isLoading && (saved.data?.length ?? 0) === 0} href="/feed" cta="Browse the feed">
        <div className="flex flex-col gap-4">
          {(saved.data ?? []).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </Section>
    </div>
  );
}
