import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Renders the PlayConnect mark. The source file (public/logo.png) already
 * contains the wordmark and tagline, so `withWordmark` controls whether we
 * show the full lockup (landing/auth screens) or just the glyph-cropped
 * version at small sizes (navbar).
 */
export function Logo({ size = 40, withWordmark = false, className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 select-none", className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <Image src="/logo.png" alt="PlayConnect" fill sizes={`${size}px`} className="object-cover" priority />
      </div>
      {withWordmark && (
        <span className="font-wordmark text-base font-normal uppercase tracking-[0.2em] text-foreground">PlayConnect</span>
      )}
    </Link>
  );
}
