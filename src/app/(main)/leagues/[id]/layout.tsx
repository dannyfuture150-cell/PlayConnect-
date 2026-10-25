import type { Metadata } from "next";
import { headers } from "next/headers";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";

/** Gives shared links a proper preview card (name, game, prize, date) in WhatsApp, X, etc. */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    if (!initAdmin()) return {};
    const snap = await getFirestore().doc(`leagues/${params.id}`).get();
    const d = snap.data();
    if (!d) return {};
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    const base = host ? `${proto}://${host}` : "";
    const bits: string[] = [d.game];
    if (d.prize) bits.push(`Prize: ${d.prize}`);
    bits.push(d.entryType === "paid" ? `Entry: ${d.entryFee ?? "paid"}` : "Free entry");
    const when = d.startsAt?.toDate?.();
    if (when) bits.push(when.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));
    const title = `${d.name} · PlayConnect`;
    const description = bits.join(" · ");
    const images = base ? [{ url: `${base}/icons/icon-512.png`, width: 512, height: 512 }] : undefined;
    return {
      title,
      description,
      openGraph: { title, description, type: "website", url: base ? `${base}/leagues/${params.id}` : undefined, images },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return {};
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
