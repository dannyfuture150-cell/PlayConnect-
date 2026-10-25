"use client";

import { useEffect, useState } from "react";
import { Coins, Shield, Target } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { callStars, useStarLog, useStars } from "@/hooks/useStars";
import { MISSIONS, type MissionProgress } from "@/lib/starsCatalog";
import { bannerStyle, frameStyle, nameStyle, SLOT_LABEL, STAR_ITEMS, STAR_RULES, STAR_SLOTS, type StarItem } from "@/lib/starsCatalog";
import { makeCardSnapshot } from "@/lib/playerCardSnapshot";
import { FlipCard } from "@/components/feed/FlipCard";
import { ReferCard } from "@/components/stars/ReferCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Preview({ item }: { item: StarItem }) {
  const { profile } = useAuth();
  if (!profile) return null;
  const box = "flex h-28 items-center justify-center overflow-hidden rounded-xl bg-muted";
  if (item.slot === "frame") {
    return (
      <div className={box}>
        <span className="inline-flex rounded-full p-1" style={frameStyle(item.id)}>
          <Avatar className="h-20 w-20 border-2 border-card">
            <AvatarImage src={profile.photoURL ?? undefined} alt="" />
            <AvatarFallback>{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </span>
      </div>
    );
  }
  if (item.slot === "title") {
    return (
      <div className={`${box} flex-col gap-1 px-2 text-center`}>
        <span className="text-base font-bold">{profile.displayName}</span>
        <span className="text-xs font-semibold text-steel/80">{item.name}</span>
      </div>
    );
  }
  if (item.slot === "namecolor") {
    return (
      <div className={box}>
        <span className="text-xl font-extrabold" style={nameStyle(item.id)}>{profile.displayName}</span>
      </div>
    );
  }
  if (item.slot === "banner") {
    return <div className="h-28 rounded-xl" style={bannerStyle(item.id)} />;
  }
  return (
    <div className={`pointer-events-none ${box}`}>
      <FlipCard card={{ ...makeCardSnapshot(profile), style: item.id }} className="w-[5.2rem]" />
    </div>
  );
}

export default function StarsPage() {
  const { profile } = useAuth();
  // Opening this page collects anything you have earned, including friends who joined through you.
  useEffect(() => {
    if (!profile?.uid) return;
    callStars({ action: "sync" })
      .then(() => callStars({ action: "missions" }))
      .then((r) => { if (r.ok && r.missions) { setMissions(r.missions); setWeekEnds(r.weekEnds ?? 0); } })
      .catch(() => undefined);
  }, [profile?.uid]);
  const [missions, setMissions] = useState<MissionProgress[] | null>(null);
  const [weekEnds, setWeekEnds] = useState(0);
  const stars = useStars(profile?.uid);
  const log = useStarLog(profile?.uid);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!profile) return null;

  async function run(key: string, fn: () => ReturnType<typeof callStars>) {
    setBusy(key);
    setMsg(null);
    const r = await fn();
    if (!r.ok) setMsg(r.error ?? "That didn't work.");
    setBusy(null);
  }

  const won = (profile.tournamentWins ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-steel/60">My rewards</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-4xl font-bold">
            <Coins className="h-9 w-9 text-yellow-400" /> {stars.balance}
            <span className="text-lg font-semibold text-steel/70">PlayCoins</span>
          </p>
          {stars.loginStreak > 1 && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">🔥 {stars.loginStreak}-day streak</span>
          )}
        </div>
        <p className="mt-2 text-xs text-steel/60">PlayCoins can only be used inside PlayConnect. They can&apos;t be cashed out or sent to others. You can spend them in the store, on tournament entries, or on shop items sellers accept them for.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <Target className="h-5 w-5" /> Weekly missions
        </p>
        <p className="mt-1 text-xs text-steel/60">
          Finish them for PlayCoins. Finish all three for {STAR_RULES.missionAllBonus} 🪙 extra.
          {weekEnds > 0 && ` Resets in ${Math.max(1, Math.ceil((weekEnds - Date.now()) / 86400000))} day${Math.ceil((weekEnds - Date.now()) / 86400000) === 1 ? "" : "s"}.`}
        </p>
        <div className="mt-3 space-y-3">
          {(missions ?? MISSIONS.map((m) => ({ ...m, progress: 0, done: false }))).map((m) => (
            <div key={m.id}>
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className={cn("min-w-0", m.done && "text-steel/50 line-through")}>{m.title}</span>
                <span className={cn("shrink-0 font-bold", m.done ? "text-emerald-500" : "text-yellow-500")}>{m.done ? "Done ✓" : `+${m.reward} 🪙`}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.min(100, (m.progress / m.goal) * 100)}%` }} />
                </div>
                <span className="text-[11px] text-steel/60">{m.progress}/{m.goal}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-display text-lg font-bold">
          <Shield className="h-5 w-5" /> Streak Shield
        </p>
        <p className="mt-1 text-sm text-steel/70">
          Miss a day and your streak resets. A shield saves it automatically, once, so your streak bonuses keep building. You can hold {STAR_RULES.maxShields}.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">You have {stars.shields ?? 0} 🛡️</span>
          <Button
            size="sm"
            disabled={busy === "shield" || (stars.shields ?? 0) >= STAR_RULES.maxShields || stars.balance < STAR_RULES.shieldPrice}
            onClick={() => run("shield", () => callStars({ action: "buyShield" }))}
          >
            {(stars.shields ?? 0) >= STAR_RULES.maxShields ? "Full" : stars.balance < STAR_RULES.shieldPrice ? `Need ${STAR_RULES.shieldPrice - stars.balance} more` : `Buy · ${STAR_RULES.shieldPrice} 🪙`}
          </Button>
        </div>
        {msg && <p className="mt-2 text-xs text-signal-red">{msg}</p>}
      </section>

      <ReferCard />

      <section>
        <h2 className="mb-2 font-display text-xl font-bold">Redeem your PlayCoins</h2>
        {msg && <p className="mb-2 text-sm text-signal-red">{msg}</p>}
        {STAR_SLOTS.map((slot) => (
          <div key={slot} className="mb-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-steel/60">{SLOT_LABEL[slot]}</h3>
            <div className="grid grid-cols-2 gap-3">
          {STAR_ITEMS.filter((i) => i.slot === slot).map((item) => {
            const owned = stars.owned.includes(item.id);
            const equipped = stars.equipped[item.slot] === item.id;
            const locked = item.winnersOnly && !won && !owned;
            return (
              <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
                <Preview item={item} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-[11px] text-steel/60">{item.desc}</p>
                </div>
                <p className="flex items-center gap-1 text-base font-bold text-yellow-500">
                  {item.price} <Coins className="h-4 w-4 text-yellow-400" />
                </p>
                {owned ? (
                  <Button
                    size="sm"
                    variant={equipped ? "default" : "outline"}
                    disabled={busy === item.id}
                    onClick={() => run(item.id, () => callStars({ action: "equip", slot: item.slot, itemId: equipped ? null : item.id }))}
                  >
                    {equipped ? "Using · tap to remove" : "Use this"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(locked && "opacity-60")}
                    disabled={busy === item.id || locked || stars.balance < item.price}
                    onClick={() => run(item.id, () => callStars({ action: "redeem", itemId: item.id }))}
                  >
                    {locked ? "Winners only" : stars.balance < item.price ? `Need ${item.price - stars.balance} more` : "Redeem"}
                  </Button>
                )}
              </div>
            );
          })}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 font-display text-base font-bold">How to earn PlayCoins</h2>
        <ul className="space-y-1.5 text-sm text-steel/80">
          <li>🪙 {STAR_RULES.daily} for opening the app each day (+{STAR_RULES.streakBonus} on every 7th day in a row)</li>
          <li>🪙 {STAR_RULES.join} for joining a tournament</li>
          <li>🪙 {STAR_RULES.win} for winning a tournament 🏆</li>
          <li>🪙 Weekly missions, up to {MISSIONS.reduce((n, m) => n + m.reward, 0) + STAR_RULES.missionAllBonus} a week</li>
          <li>🪙 {STAR_RULES.streakBigBonus} extra on every 30th day in a row</li>
          <li>🪙 {STAR_RULES.challengeWin} for winning a confirmed 1v1 challenge (up to {STAR_RULES.challengeWinsPerDay} a day)</li>
        </ul>
        <p className="mt-2 text-xs text-steel/50">PlayCoins are added automatically. It can take a few minutes after you open the app.</p>
      </section>

      {log.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-base font-bold">Recent activity</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {log.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-b-0">
                <span className="min-w-0 truncate">{l.reason}</span>
                <span className={cn("shrink-0 font-bold", l.amount >= 0 ? "text-emerald-500" : "text-steel/60")}>
                  {l.amount >= 0 ? "+" : ""}{l.amount} 🪙
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
