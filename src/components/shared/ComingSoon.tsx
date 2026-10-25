import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
      <p className="max-w-xs text-sm text-steel/60">{description}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-violet-glow">Coming soon</p>
    </Card>
  );
}
