"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Swords, Radio } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Logo } from "@/components/shared/Logo";
import { LogoMark } from "@/components/shared/LogoMark";
import { InstallAppCard } from "@/components/shared/InstallAppCard";
import { LandingTournaments } from "@/components/shared/LandingTournaments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Users,
    title: "Build your squad",
    body: "Follow players, join game-specific communities, and grow a network that actually plays together.",
  },
  {
    icon: Trophy,
    title: "Compete in tournaments",
    body: "Create or join brackets, schedule matches, and watch the leaderboard move in real time.",
  },
  {
    icon: Swords,
    title: "Prove your rank",
    body: "A player card that shows your skill level, badges, and reputation — no grinding a spreadsheet required.",
  },
  {
    icon: Radio,
    title: "Share the highlight",
    body: "Post clips, screenshots, and updates to a feed that's actually about games, not algorithms.",
  },
];

export default function LandingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Already signed in with a finished profile? Skip the sales page entirely.
  useEffect(() => {
    if (!loading && user && profile?.onboardingComplete) router.replace("/feed");
  }, [loading, user, profile, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Logo size={40} withWordmark />
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <Link href="/feed"><Button>Go to feed</Button></Link>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
              <Link href="/signup"><Button>Join now</Button></Link>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-12 text-center md:pt-20">
        <LogoMark width={200} height={200} className="animate-fade-up" />

        <p className="mt-6 rounded-full border border-violet/30 bg-violet/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-glow animate-fade-up sm:text-sm">
          Where gamers connect — for the love of the game
        </p>

        <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl md:text-6xl animate-fade-up">
          Every player. Every game.{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">One network.</span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-steel/60 animate-fade-up">
          PlayConnect is where gamers build a profile that means something — feed, communities,
          tournaments, and a player card that proves it. Connect. Compete. Conquer.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
          <Link href="/signup"><Button size="lg">Create your player card</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline">I already play</Button></Link>
        </div>

        <LandingTournaments />

        <div className="mt-24 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5 text-left">
              <Icon className="h-6 w-6 text-violet-glow" />
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-steel/50">{body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-16 w-full max-w-md">
          <InstallAppCard />
        </div>

        <footer className="mb-10 mt-24 text-xs text-steel/30">
          © {new Date().getFullYear()} PlayConnect. Connect. Compete. Conquer.
        </footer>
      </main>
    </div>
  );
}
