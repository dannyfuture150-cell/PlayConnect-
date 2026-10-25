import Image from "next/image";
import { cn } from "@/lib/utils";

/** Shows the full uploaded logo artwork (glyph + wordmark + tagline) uncropped. */
export function LogoMark({ className, width = 220, height = 220 }: { className?: string; width?: number; height?: number }) {
  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      <Image src="/logo.png" alt="PlayConnect — Connect. Compete. Conquer." fill className="object-contain" priority />
    </div>
  );
}
