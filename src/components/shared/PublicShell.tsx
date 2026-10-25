"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { withNext } from "@/lib/nextUrl";

/**
 * What a signed-out visitor sees around a shared tournament link: just the
 * tournament, with a clear way to join. No sign-in wall before they can see
 * the prize, the time and who is playing.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const back = pathname;
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-void">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Logo size={32} withWordmark />
        <div className="flex items-center gap-2">
          <Link href={withNext("/login", back)}><Button size="sm" variant="ghost">Sign in</Button></Link>
          <Link href={withNext("/signup", `${back}?join=1`)}><Button size="sm">Join free</Button></Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-6 pb-28">{children}</main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-steel/60">
            Free to join. Sign up in under a minute with Google.
          </p>
          <Link href={withNext("/signup", `${back}?join=1`)}>
            <Button>Sign up &amp; join</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
