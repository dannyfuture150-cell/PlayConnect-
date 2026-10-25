import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkFolderAccess, folderAllowed, uidFromRequest } from "@/lib/uploadAuth";
import { r2CompleteMultipart, r2Configured, r2PartUrl, r2PublicUrl, r2PutUrl, r2StartMultipart } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = { image: 12 * 1024 * 1024, audio: 12 * 1024 * 1024, video: 100 * 1024 * 1024 };
const SINGLE_LIMIT = 8 * 1024 * 1024; // bigger than this goes up in pieces

const safeName = (n: string) => (n.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+/, "").slice(-80) || "file");

/**
 * Hands a signed-in user short-lived upload links for Cloudflare R2, limited
 * to their own folders. The R2 secret never leaves the server.
 *   action "single"   -> one upload link for a whole (smaller) file
 *   action "start"    -> begins a multipart upload for a big file
 *   action "part"     -> an upload link for one piece
 *   action "complete" -> joins the pieces
 */
export async function POST(req: Request) {
  if (!r2Configured()) return NextResponse.json({ ok: false, notConfigured: true, error: "R2 isn't set up." }, { status: 200 });

  const who = await uidFromRequest(req);
  if ("error" in who) return NextResponse.json({ ok: false, error: who.error }, { status: who.status });
  const uid = who.uid;

  let body: {
    action?: string; folder?: string; filename?: string; contentType?: string; size?: number;
    key?: string; uploadId?: string; partNumber?: number; parts?: { PartNumber: number; ETag: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  try {
    if (body.action === "single" || body.action === "start") {
      const folder = String(body.folder ?? "").replace(/^\/+|\/+$/g, "");
      const denied = await checkFolderAccess(uid, folder);
      if (denied) return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });

      const contentType = String(body.contentType ?? "");
      const kind = contentType.startsWith("image/") ? "image" : contentType.startsWith("video/") ? "video" : contentType.startsWith("audio/") ? "audio" : null;
      if (!kind) return NextResponse.json({ ok: false, error: "Only photos, videos and voice notes can be uploaded." }, { status: 400 });
      const size = Number(body.size ?? 0);
      if (!(size > 0) || size > MAX_BYTES[kind]) {
        return NextResponse.json({ ok: false, error: `That ${kind} is too large.` }, { status: 413 });
      }

      const key = `${folder}/${Date.now()}-${randomBytes(4).toString("hex")}-${safeName(String(body.filename ?? "file"))}`;
      if (body.action === "single") {
        return NextResponse.json({ ok: true, key, uploadUrl: r2PutUrl(key), publicUrl: r2PublicUrl(key) });
      }
      const uploadId = await r2StartMultipart(key, contentType);
      return NextResponse.json({ ok: true, key, uploadId, publicUrl: r2PublicUrl(key) });
    }

    // part / complete: the key must still sit in one of this user's allowed folders
    const key = String(body.key ?? "");
    const uploadId = String(body.uploadId ?? "");
    if (!key || !uploadId || !folderAllowed(key.slice(0, key.lastIndexOf("/")), uid)) {
      return NextResponse.json({ ok: false, error: "Not allowed to upload there." }, { status: 403 });
    }
    if (body.action === "part") {
      const n = Number(body.partNumber);
      if (!Number.isInteger(n) || n < 1 || n > 10000) return NextResponse.json({ ok: false, error: "Bad part." }, { status: 400 });
      return NextResponse.json({ ok: true, uploadUrl: r2PartUrl(key, uploadId, n) });
    }
    if (body.action === "complete") {
      const parts = Array.isArray(body.parts) ? body.parts : [];
      if (!parts.length || parts.some((p) => !p || !Number.isInteger(p.PartNumber) || typeof p.ETag !== "string")) {
        return NextResponse.json({ ok: false, error: "Bad parts." }, { status: 400 });
      }
      await r2CompleteMultipart(key, uploadId, parts);
      return NextResponse.json({ ok: true, publicUrl: r2PublicUrl(key) });
    }
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "The upload couldn't be started. Try again." }, { status: 502 });
  }
}
