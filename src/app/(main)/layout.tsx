import { AuthGuard } from "@/components/shared/AuthGuard";
import { PublicShell } from "@/components/shared/PublicShell";
import { NavbarSwitch } from "@/components/layout/NavbarSwitch";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { TrophyCelebration } from "@/components/shared/TrophyCelebration";
import { StarsSync } from "@/components/stars/StarsSync";
import { BadgeCelebration } from "@/components/shared/BadgeCelebration";
import { LevelUpCelebration } from "@/components/shared/LevelUpCelebration";
import { MainFrame } from "@/components/layout/MainFrame";
import { SwipeTabs } from "@/components/layout/SwipeTabs";
import { RightRail } from "@/components/layout/RightRail";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard publicFallback={<PublicShell>{children}</PublicShell>}>
      <div className="min-h-screen w-full overflow-x-hidden">
        <NavbarSwitch />
        <div className="mx-auto flex w-full max-w-7xl min-w-0">
          <Sidebar />
          <MainFrame>
            <div className="flex min-w-0 gap-6">
              <div className="w-full min-w-0 max-w-3xl"><SwipeTabs>{children}</SwipeTabs></div>
              <RightRail />
            </div>
          </MainFrame>
        </div>
        <MobileNav />
        <TrophyCelebration />
        <LevelUpCelebration />
        <BadgeCelebration />
        <StarsSync />
      </div>
    </AuthGuard>
  );
}
