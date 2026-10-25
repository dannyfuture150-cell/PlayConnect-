"use client";

import { Download, Share, SquarePlus, CheckCircle2, MoreVertical } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/shared/LogoMark";

export function InstallAppCard() {
  const { installed, ios, canPrompt, promptInstall } = useInstallPrompt();

  if (installed) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-signal-green" />
        <div>
          <p className="text-sm font-semibold text-foreground">PlayConnect is installed</p>
          <p className="text-xs text-steel/50">You're running it as an app on this device.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <LogoMark width={44} height={44} className="shrink-0 overflow-hidden rounded-xl" />
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Put PlayConnect on your home screen</h3>
          <p className="text-xs text-steel/50">Optional. Everything already works in your browser, no install needed.</p>
        </div>
      </div>

      {ios ? (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-steel/70">
          <p className="font-medium text-foreground">On iPhone/iPad:</p>
          <p className="flex items-center gap-1.5">
            <Share className="h-3.5 w-3.5 shrink-0" /> 1. Tap the <strong>Share</strong> button in Safari
          </p>
          <p className="flex items-center gap-1.5">
            <SquarePlus className="h-3.5 w-3.5 shrink-0" /> 2. Tap <strong>&quot;Add to Home Screen&quot;</strong>
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted p-3 text-xs text-steel/70">
          <p className="font-medium text-foreground">Easiest way (works on every Android phone):</p>
          <p className="flex items-center gap-1.5">
            <MoreVertical className="h-3.5 w-3.5 shrink-0" /> 1. Open this page in <strong>Chrome</strong> and tap the <strong>menu (⋮)</strong>
          </p>
          <p className="flex items-center gap-1.5">
            <SquarePlus className="h-3.5 w-3.5 shrink-0" /> 2. Tap <strong>&quot;Add to Home screen&quot;</strong>, then <strong>&quot;Create shortcut&quot;</strong>
          </p>
        </div>
      )}

      {canPrompt && !ios && (
        <>
          <Button variant="outline" className="mt-3 w-full" onClick={promptInstall}>
            <Download className="h-4 w-4" />
            Or try the full install
          </Button>
          <p className="mt-2 text-[11px] text-steel/40">
            If your phone says &quot;blocked&quot; or &quot;couldn&apos;t install&quot;, ignore it. Use the shortcut above or just keep
            using PlayConnect in Chrome.
          </p>
        </>
      )}
    </Card>
  );
}
