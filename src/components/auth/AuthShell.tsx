import { ReactNode } from "react";
import { LogoMark } from "@/components/shared/LogoMark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-void">
      {/* ambient brand glow, matches the hex/nebula texture in the source mark */}
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />

      {/* Branding panel */}
      <div className="relative hidden w-[42%] flex-col items-center justify-center border-r border-border/60 bg-card px-10 lg:flex">
        <LogoMark width={280} height={280} />
        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-steel/60">
          The social network built for players. Find your squad, prove your skill, own the leaderboard.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <LogoMark width={140} height={140} />
        </div>
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-steel/60">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
