import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { checkFolderAccess, uidFromRequest } from "@/lib/uploadAuth";
import { r2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cloudinary upload signature (the older way). Used only when Cloudflare R2
 * isn't set up. The Cloudinary secret never leaves the server, and nobody can
 * upload without being signed in.
 */
export async function POST(req: Request) {
  // When R2 is configured the app uploads through /api/r2-upload instead.
  if (r2Configured()) return NextResponse.json({ ok: false, error: "Use R2 uploads.", useR2: true }, { status: 409 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ ok: false, error: "Uploads aren't set up yet (missing Cloudinary keys)." }, { status: 503 });
  }

  const who = await uidFromRequest(req);
  if ("error" in who) return NextResponse.json({ ok: false, error: who.error }, { status: who.status });
  const uid = who.uid;

  let body: { folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const requested = String(body.folder ?? "").replace(/^\/+|\/+$/g, "");
  const denied = await checkFolderAccess(uid, requested);
  if (denied) return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });

  const folder = `playconnect/${requested}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signs the alphabetically-sorted params (excluding file/api_key/resource_type) + secret.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");

  return NextResponse.json({ ok: true, cloudName, apiKey, timestamp, signature, folder });
}
