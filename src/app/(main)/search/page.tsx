"use client";

import { StoryRing } from "@/components/shared/StoryRing";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { hasVerifiedBadge } from "@/lib/verified";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Search as SearchIcon, Users, Trophy, Layers, Gamepad2, X } from "lucide-react";
import { useSuggestedPlayers } from "@/hooks/useExplore";
import { useCommunities } from "@/hooks/useCommunities";
import { useAuth } from "@/providers/AuthProvider";
import { useSearch } from "@/hooks/useSearch";
import { formatCount } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/profile/FollowButton";

const RECENT_KEY = "playconnect-recent-searches";

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

function storeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {}
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-steel/50">{children}</h2>;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [text, setText] = useState(searchParams.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useSearch(text);
  const { profile } = useAuth();
  const { data: suggested } = useSuggestedPlayers(profile?.uid);
  const { data: communities } = useCommunities();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(loadRecent()), []);

  function remember(term: string) {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    storeRecent(next);
    setRecent(next);
  }
  function forget(term: string) {
    const next = loadRecent().filter((x) => x !== term);
    storeRecent(next);
    setRecent(next);
  }
  function clearRecent() {
    storeRecent([]);
    setRecent([]);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (text.trim()) params.set("q", text.trim());
      else params.delete("q");
      router.replace(`/search?${params.toString()}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const hasQuery = text.trim().length >= 2;
  const hasAnyResults =
    data && (data.users.length || data.tournaments.length || data.communities.length || data.leagues.length);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Search</h1>
        <form
          className="relative mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            remember(text);
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel/40" />
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search players, tournaments, communities, leagues…"
            className="pl-9"
            enterKeyHint="search"
          />
        </form>
      </div>

      {!hasQuery && (
        <>
          {recent.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <SectionLabel>Recent searches</SectionLabel>
                <button type="button" onClick={clearRecent} className="text-xs font-medium text-violet-glow">Clear all</button>
              </div>
              {recent.map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-muted">
                  <Clock className="h-4 w-4 shrink-0 text-steel/40" />
                  <button type="button" onClick={() => setText(r)} className="flex-1 truncate text-left text-sm text-foreground">
                    {r}
                  </button>
                  <button type="button" onClick={() => forget(r)} aria-label={`Remove ${r}`} className="p-1 text-steel/40 hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {suggested && suggested.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Players</span>
              </SectionLabel>
              {suggested.slice(0, 8).map((u) => (
                <div key={u.uid} className="flex items-center gap-3 py-1">
                  <Link href={`/profile/${u.username}`} className="flex flex-1 items-center gap-3 overflow-hidden">
                    <StoryRing uid={u.uid}>
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
                        <AvatarFallback>{u.displayName[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </StoryRing>
                    <div className="overflow-hidden">
                      <p className="flex items-center truncate text-sm font-semibold text-foreground">
                        {u.displayName}
                        {hasVerifiedBadge(u.badges) && <VerifiedBadge className="ml-1" />}
                      </p>
                      <p className="truncate text-xs text-steel/50">@{u.username} · {formatCount(u.followersCount)} followers</p>
                    </div>
                  </Link>
                  <FollowButton targetUid={u.uid} />
                </div>
              ))}
            </div>
          )}

          {communities && communities.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>
                <span className="flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /> Gaming communities</span>
              </SectionLabel>
              {[...communities].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0)).slice(0, 8).map((c) => (
                <Link key={c.id} href={`/communities/${c.slug}`} className="flex items-center gap-3 py-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-steel/50">{c.game} · {formatCount(c.memberCount)} members</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {hasQuery && isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {hasQuery && !isLoading && !hasAnyResults && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-steel/50">No results for &quot;{text.trim()}&quot;.</p>
        </div>
      )}

      {data && data.users.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Players</span>
          </SectionLabel>
          {data.users.map((u) => (
            <Card key={u.uid} className="flex items-center gap-3 p-3">
              <Link href={`/profile/${u.username}`} onClick={() => remember(text)} className="flex flex-1 items-center gap-3 overflow-hidden">
                <StoryRing uid={u.uid}><Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
                  <AvatarFallback>{u.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar></StoryRing>
                <div className="overflow-hidden">
                  <p className="flex items-center truncate text-sm font-semibold text-foreground">{u.displayName}{hasVerifiedBadge(u.badges) && <VerifiedBadge className="ml-1" />}</p>
                  <p className="truncate text-xs text-steel/50">@{u.username} · {formatCount(u.followersCount)} followers</p>
                </div>
              </Link>
              <FollowButton targetUid={u.uid} />
            </Card>
          ))}
        </div>
      )}

      {data && data.tournaments.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>
            <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> Tournaments</span>
          </SectionLabel>
          {data.tournaments.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} onClick={() => remember(text)}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="truncate text-xs text-steel/50">{t.game} · {t.participantIds.length}/{t.maxParticipants} joined</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.communities.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>
            <span className="flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /> Communities</span>
          </SectionLabel>
          {data.communities.map((c) => (
            <Link key={c.id} href={`/communities/${c.slug}`} onClick={() => remember(text)}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-steel/50">{c.game} · {formatCount(c.memberCount)} members</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.leagues.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>
            <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Leagues</span>
          </SectionLabel>
          {data.leagues.map((l) => (
            <Link key={l.id} href={`/leagues/${l.id}`} onClick={() => remember(text)}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
                  <p className="truncate text-xs text-steel/50">{l.game} · {l.teamsCount} teams</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
