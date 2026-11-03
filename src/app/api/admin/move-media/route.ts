import { NextResponse } from "next/server";
import { FieldPath, getFirestore, type Query } from "firebase-admin/firestore";
import { uidFromRequest } from "@/lib/uploadAuth";
import { r2Configured, r2ListPage, r2PublicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin only. Finds old Cloudinary links in saved records and points them at the copy already in R2.
 *   { action: "scan" | "apply", group: <index>, after?: <doc path> }  -> handles one batch of one record type
 * "scan" only counts; "apply" writes. Links with no R2 copy are left alone.
 */

// every kind of record that can hold a picture or video link (collection-group names)
const GROUPS = [
  "users", "posts", "comments", "stories", "threads", "messages", "challenges", "communities", "chat",
  "announcements", "leagues", "tournaments", "shots", "results", "teams", "lives", "shopItems", "shopOrders",
  "ads", "badges", "reports", "items",
];
const BATCH = 150;
const CLOUD_RE = /https:\/\/res\.cloudinary\.com\/[^\s"'<>)]+/g;

/* ---- what is in the bucket (cached for a few minutes between batches) ---- */
interface Index {
  at: number;
  total: number;
  full: Map<string, string>; // key without extension -> key
  base: Map<string, string[]>; // file name without extension -> keys
}
let cache: Index | null = null;

const noExt = (s: string) => s.replace(/\.[A-Za-z0-9]{1,5}$/, "");

async function getIndex(): Promise<Index> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache;
  const idx: Index = { at: Date.now(), total: 0, full: new Map(), base: new Map() };
  let token: string | undefined;
  for (let i = 0; i < 200; i++) {
    const page = await r2ListPage(token);
    for (const k of page.keys) {
      if (k.endsWith("/")) continue;
      idx.total++;
      const bare = noExt(k);
      idx.full.set(bare, k);
      const b = bare.split("/").pop() as string;
      const list = idx.base.get(b);
      if (list) list.push(k);
      else idx.base.set(b, [k]);
    }
    if (!page.next) break;
    token = page.next;
  }
  cache = idx;
  return idx;
}

/** The file path inside Cloudinary (no transformations, no version, no extension). */
function publicIdOf(url: string): string | null {
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/(?:upload|authenticated)\/(.+)$/);
  if (!m) return null;
  const segs = m[1].split("?")[0].split("/");
  while (segs.length > 1 && (/^v\d+$/.test(segs[0]) || /^[a-z]{1,3}_[^/]*$/.test(segs[0]) || segs[0].includes(","))) segs.shift();
  let id = segs.join("/");
  try {
    id = decodeURIComponent(id);
  } catch {}
  return noExt(id);
}

function findKey(idx: Index, publicId: string): string | null {
  const exact = idx.full.get(publicId);
  if (exact) return exact;
  // the copy may sit under a folder prefix
  const base = publicId.split("/").pop() as string;
  const cands = idx.base.get(base);
  if (cands) {
    const tail = "/" + publicId;
    const hits = cands.filter((k) => noExt(k).endsWith(tail));
    if (hits.length === 1) return hits[0];
    if (!hits.length && cands.length === 1) return cands[0];
  }
  return null;
}

interface Stats { found: number; moved: number; missing: number; samples: string[] }

function mapString(s: string, idx: Index, st: Stats): string {
  return s.replace(CLOUD_RE, (url) => {
    st.found++;
    const id = publicIdOf(url);
    const key = id ? findKey(idx, id) : null;
    if (!key) {
      st.missing++;
      if (st.samples.length < 5) st.samples.push(url.slice(0, 140));
      return url;
    }
    st.moved++;
    return r2PublicUrl(key);
  });
}

/** Walks plain objects / lists only, so timestamps and references are never touched. */
function walk(v: unknown, path: string[], idx: Index, st: Stats, out: { path: string[]; value: unknown }[]): unknown {
  if (typeof v === "string") {
    return v.includes("res.cloudinary.com") ? mapString(v, idx, st) : v;
  }
  if (Array.isArray(v)) {
    let changed = false;
    const copy = v.map((x) => {
      const n = walk(x, path, idx, st, []);
      if (n !== x) changed = true;
      return n;
    });
    if (changed) out.push({ path, value: copy });
    return changed ? copy : v;
  }
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    const o = v as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      const n = walk(o[k], [...path, k], idx, st, out);
      if (typeof o[k] === "string" && n !== o[k]) out.push({ path: [...path, k], value: n });
    }
    return v;
  }
  return v;
}

export async function POST(req: Request) {
  if (!r2Configured()) return NextResponse.json({ ok: false, error: "R2 isn't set up on the server." });
  const who = await uidFromRequest(req);
  if ("error" in who) return NextResponse.json({ ok: false, error: who.error }, { status: who.status });

  const db = getFirestore();
  const me = (await db.doc(`users/${who.uid}`).get()).data() as { isAdmin?: boolean } | undefined;
  if (me?.isAdmin !== true) return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });

  let body: { action?: string; group?: number; after?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const apply = body.action === "apply";
  const gi = Math.floor(Number(body.group) || 0);
  if (gi < 0 || gi >= GROUPS.length) return NextResponse.json({ ok: true, done: true, groups: GROUPS });

  try {
    const idx = await getIndex();
    let q: Query = db.collectionGroup(GROUPS[gi]).orderBy(FieldPath.documentId()).limit(BATCH);
    if (body.after) q = q.startAfter(body.after);
    const snap = await q.get();

    const st: Stats = { found: 0, moved: 0, missing: 0, samples: [] };
    let docsChanged = 0;
    const batch = db.batch();
    for (const d of snap.docs) {
      const out: { path: string[]; value: unknown }[] = [];
      walk(d.data() as Record<string, unknown>, [], idx, st, out);
      if (!out.length) continue;
      docsChanged++;
      if (apply) {
        const args: unknown[] = [];
        for (const o of out) args.push(new FieldPath(...o.path), o.value);
        (batch.update as unknown as (ref: unknown, ...a: unknown[]) => void)(d.ref, ...args);
      }
    }
    if (apply && docsChanged) await batch.commit();

    const last = snap.docs.length ? snap.docs[snap.docs.length - 1].ref.path : null;
    return NextResponse.json({
      ok: true,
      group: GROUPS[gi],
      groupIndex: gi,
      groupCount: GROUPS.length,
      reads: snap.size,
      docsChanged,
      ...st,
      bucketFiles: idx.total,
      next: snap.size === BATCH && last ? { group: gi, after: last } : { group: gi + 1 },
    });
  } catch (e) {
    const msg = (e as { message?: string; code?: unknown })?.message ?? "unknown";
    return NextResponse.json({ ok: false, error: `${msg}`.slice(0, 200), code: (e as { code?: unknown })?.code ?? null });
  }
}
