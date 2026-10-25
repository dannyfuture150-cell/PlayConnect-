import { auth } from "@/lib/firebase/client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // Cloudinary free plan image limit

const EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  heic: "image/heic", heif: "image/heif",
  mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v", webm: "video/webm", "3gp": "video/3gpp", mkv: "video/x-matroska",
};

/**
 * Phones/pickers sometimes give files an EMPTY type (common with videos from
 * WhatsApp or file managers). Storage rules require a video/* or image/*
 * content type, so we work it out from the extension when it's missing.
 */
export function fileContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPES[ext] ?? "application/octet-stream";
}

export const isVideoFile = (file: File) => fileContentType(file).startsWith("video/");
export const isImageFile = (file: File) => fileContentType(file).startsWith("image/");

/** Storage-safe file name: no spaces/odd characters, bounded length. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+/, "");
  return cleaned.slice(-80) || "file";
}

/**
 * Shrinks big camera photos (often 8-20MB) to a sensible size before upload,
 * so they upload fast and never hit the 10MB limit. Falls back to the
 * original file if the browser can't decode it (e.g. HEIC) or on any error.
 */
async function prepareImage(file: File): Promise<File> {
  const type = fileContentType(file);
  if (!type.startsWith("image/") || type === "image/gif" || type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const MAX_DIM = 1600; // photos are stored as sent (no resizing on delivery), so keep them phone-sized
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// ---------------------------------------------------------------------------
// Upload plumbing. Phone connections are slow and drop constantly, so:
//  - big files are sent in small pieces and each piece is retried on its own
//    (a drop costs a few MB, not the whole video);
//  - a stalled connection is detected after 45s of silence instead of hanging;
//  - when the phone is offline we wait for it to come back before retrying.
// ---------------------------------------------------------------------------
const CHUNK_THRESHOLD = 8 * 1024 * 1024; // above this, upload in pieces
const CHUNK_SIZE = 6 * 1024 * 1024; // Cloudinary needs pieces of at least 5MB (except the last)
const STALL_MS = 45 * 1000;
const uploadedUrls = new WeakMap<File, string>();

type Signature = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; at: number };

class UploadError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** If the phone has no connection, wait (up to a minute) for it to come back before trying again. */
async function waitOnline(maxMs = 60_000) {
  if (typeof navigator === "undefined" || navigator.onLine) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      window.removeEventListener("online", finish);
      resolve();
    };
    const timer = setTimeout(finish, maxMs);
    window.addEventListener("online", finish);
  });
}

async function getSignature(user: { getIdToken: () => Promise<string> }, folder: string): Promise<Signature> {
  let signRes: Response;
  try {
    signRes = await fetch("/api/upload-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ folder }),
    });
  } catch {
    throw new UploadError("Network error — check your connection and try again.", true);
  }
  const sign = await signRes.json().catch(() => null);
  if (!signRes.ok || !sign?.ok) {
    throw new UploadError(
      sign?.error || `Couldn't start the upload (server ${signRes.status}).`,
      signRes.status >= 500 && signRes.status !== 503
    );
  }
  return { ...sign, at: Date.now() } as Signature;
}

/** One request to Cloudinary. Fails fast if no bytes move for STALL_MS. */
function sendForm(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onLoaded?: (loaded: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    let stall: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => xhr.abort(), STALL_MS);
    };
    const fail = (message: string, retryable: boolean) => {
      clearTimeout(stall);
      reject(new UploadError(message, retryable));
    };
    xhr.upload.onprogress = (e) => {
      arm();
      if (e.lengthComputable) onLoaded?.(e.loaded);
    };
    xhr.upload.onload = arm; // all bytes sent; now waiting for Cloudinary to answer
    xhr.onload = () => {
      clearTimeout(stall);
      let res: any = null;
      try {
        res = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(res ?? {});
      else fail(res?.error?.message || "Upload failed.", xhr.status >= 500 || xhr.status === 429 || xhr.status === 408);
    };
    xhr.onerror = () => fail("Network error during upload.", true);
    xhr.onabort = () => fail("The connection stalled.", true);
    arm();
    xhr.send(form);
  });
}

function baseForm(sign: Signature) {
  const form = new FormData();
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);
  return form;
}

async function withRetries<T>(tries: number, run: (attempt: number) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      await waitOnline();
      return await run(attempt);
    } catch (e: any) {
      const retryable = e?.retryable === true || e instanceof TypeError;
      if (!retryable || attempt >= tries - 1) {
        if (retryable) throw new Error(`Your connection kept dropping. Try again when the signal is better.${e?.message ? ` (${String(e.message).slice(0, 80)})` : ""}`);
        throw e;
      }
      await sleep(Math.min(8000, 1000 * 2 ** attempt));
    }
  }
}

async function uploadWhole(
  user: { getIdToken: () => Promise<string> },
  folder: string,
  file: File,
  endpoint: (cloudName: string) => string,
  onProgress?: (pct: number) => void
): Promise<string> {
  return withRetries(5, async () => {
    const sign = await getSignature(user, folder);
    const form = baseForm(sign);
    form.append("file", file, file.name || "upload");
    const res = await sendForm(endpoint(sign.cloudName), form, {}, (loaded) =>
      onProgress?.(Math.round((loaded / file.size) * 100))
    );
    if (!res?.secure_url) throw new UploadError("Upload failed.", true);
    return res.secure_url as string;
  });
}

async function uploadInChunks(
  user: { getIdToken: () => Promise<string> },
  folder: string,
  file: File,
  endpoint: (cloudName: string) => string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  let sign = await withRetries(4, () => getSignature(user, folder));
  const total = file.size;
  let start = 0;
  let result: any = null;

  while (start < total) {
    const end = Math.min(start + CHUNK_SIZE, total);
    const piece = file.slice(start, end);
    result = await withRetries(6, async () => {
      // Signatures expire after about an hour; refresh long before that on slow uploads.
      if (Date.now() - sign.at > 20 * 60 * 1000) sign = await getSignature(user, folder);
      const form = baseForm(sign);
      form.append("file", piece, file.name || "upload");
      return sendForm(
        endpoint(sign.cloudName),
        form,
        { "X-Unique-Upload-Id": uploadId, "Content-Range": `bytes ${start}-${end - 1}/${total}` },
        (loaded) => onProgress?.(Math.min(99, Math.round(((start + loaded) / total) * 100)))
      );
    });
    start = end;
  }

  onProgress?.(100);
  if (!result?.secure_url) throw new Error("Upload failed. Please try again.");
  return result.secure_url as string;
}


// ---------------------------------------------------------------------------
// Cloudflare R2 uploads (the main path). The server hands out short-lived
// upload links; the phone sends the file straight to R2. Small files go up in
// one request, big ones in pieces that are retried on their own.
// ---------------------------------------------------------------------------
const R2_PART_SIZE = 8 * 1024 * 1024; // R2 wants equal pieces of at least 5MB, except the last
let r2Available: boolean | null = null; // null = not checked yet; false = server not set up for R2 (use Cloudinary)

async function r2Call(user: { getIdToken: () => Promise<string> }, payload: Record<string, unknown>): Promise<any> {
  let res: Response;
  try {
    res = await fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new UploadError("Network error — check your connection and try again.", true);
  }
  const data = await res.json().catch(() => null);
  if (data?.notConfigured) return { notConfigured: true };
  if (!res.ok || !data?.ok) {
    throw new UploadError(data?.error || `Couldn't start the upload (server ${res.status}).`, res.status >= 500 && res.status !== 503);
  }
  return data;
}

/** PUTs one blob to an R2 link. Fails fast if no bytes move for STALL_MS. Resolves with the piece's ETag. */
function putBlob(url: string, blob: Blob, contentType: string, onLoaded?: (loaded: number) => void): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    let stall: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => xhr.abort(), STALL_MS);
    };
    const fail = (message: string, retryable: boolean) => {
      clearTimeout(stall);
      reject(new UploadError(message, retryable));
    };
    xhr.upload.onprogress = (e) => {
      arm();
      if (e.lengthComputable) onLoaded?.(e.loaded);
    };
    xhr.upload.onload = arm;
    xhr.onload = () => {
      clearTimeout(stall);
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.getResponseHeader("ETag"));
      // 403 usually means the link expired or was refused once: ask for a fresh one
      else fail(`Upload failed (storage said ${xhr.status}).`, xhr.status >= 500 || xhr.status === 429 || xhr.status === 408 || xhr.status === 403);
    };
    xhr.onerror = () => fail("Network error during upload.", true);
    xhr.onabort = () => fail("The connection stalled.", true);
    arm();
    xhr.send(blob);
  });
}

/** Uploads to R2. Returns null when the server isn't set up for R2 (the caller then falls back to Cloudinary). */
async function uploadViaR2(
  user: { getIdToken: () => Promise<string> },
  folder: string,
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  if (r2Available === false) return null;
  const base = { folder, filename: safeName(file.name || "upload"), contentType, size: file.size };

  if (file.size <= CHUNK_THRESHOLD) {
    const url = await withRetries(5, async () => {
      const s = await r2Call(user, { action: "single", ...base });
      if (s.notConfigured) return null;
      await putBlob(s.uploadUrl, file, contentType, (loaded) => onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100))));
      return s.publicUrl as string;
    });
    r2Available = url !== null;
    if (url) onProgress?.(100);
    return url;
  }

  const started = await withRetries(4, () => r2Call(user, { action: "start", ...base }));
  if (started.notConfigured) {
    r2Available = false;
    return null;
  }
  r2Available = true;
  const { key, uploadId } = started as { key: string; uploadId: string };
  const total = file.size;
  const parts: { PartNumber: number; ETag: string }[] = [];
  let start = 0;
  let n = 1;
  while (start < total) {
    const end = Math.min(start + R2_PART_SIZE, total);
    const piece = file.slice(start, end);
    const partNumber = n;
    const from = start;
    const etag = await withRetries(6, async () => {
      const p = await r2Call(user, { action: "part", key, uploadId, partNumber });
      const tag = await putBlob(p.uploadUrl, piece, contentType, (loaded) => onProgress?.(Math.min(99, Math.round(((from + loaded) / total) * 100))));
      if (!tag) throw new UploadError("The upload couldn't be confirmed. Please try again.", false);
      return tag;
    });
    parts.push({ PartNumber: partNumber, ETag: etag });
    start = end;
    n++;
  }
  const done = await withRetries(4, () => r2Call(user, { action: "complete", key, uploadId, parts }));
  onProgress?.(100);
  return done.publicUrl as string;
}

/**
 * Voice notes: Android records WebM and iPhones record MP4, and not every phone can play the
 * other's. Re-encode to a small mono WAV that plays everywhere. Falls back to the original on any error.
 */
async function audioToWav(file: File): Promise<File> {
  try {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return file;
    const ctx = new AC();
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close?.();
    const RATE = 16000;
    const length = Math.max(1, Math.ceil(decoded.duration * RATE));
    const off = new OfflineAudioContext(1, length, RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    const samples = rendered.getChannelData(0);
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);
    const w = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const x = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
    }
    return new File([buf], (file.name || "voice").replace(/\.[^.]+$/, "") + ".wav", { type: "audio/wav" });
  } catch {
    return file;
  }
}

function deliveryUrl(url: string, kind: "image" | "video", isAudio: boolean): string {
  // Delivery: photos get auto format/quality and a max width. Videos are
  // always served as H.264 .mp4 — the one format every phone plays — even
  // when the original was HEVC/.mov/.3gp from a camera app.
  if (kind === "image") return url.replace("/upload/", "/upload/f_auto,q_auto,w_1080,c_limit/");
  // Voice notes: Android records WebM and iPhones MP4/AAC, so serve MP3, which plays everywhere.
  if (isAudio) return url.replace(/\.[A-Za-z0-9]+$/, ".mp3");
  return url.replace("/upload/", "/upload/vc_h264,q_auto:eco,w_720,c_limit/").replace(/\.[A-Za-z0-9]+$/, ".mp4");
}


/**
 * Uploads a file to Cloudinary and returns its public URL. `path` is used as
 * the folder (everything before the last "/"), e.g. "avatars/<uid>/x.jpg".
 * The server signs the upload only for the signed-in user's own folders.
 * Photos are delivered resized/compressed, and videos in a phone-friendly
 * format, through Cloudinary's URL transformations.
 */
export async function uploadImage(path: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  // Already uploaded (e.g. the post failed afterwards and the person pressed Post again): reuse it.
  const done = uploadedUrls.get(file);
  if (done) return done;

  let toSend = isImageFile(file) ? await prepareImage(file) : file;
  if (fileContentType(toSend).startsWith("audio/") && r2Available !== false) toSend = await audioToWav(toSend);
  const contentType = fileContentType(toSend);
  if (contentType.startsWith("image/") && toSend.size > MAX_IMAGE_BYTES) {
    throw new Error("That image is too large (max 10MB).");
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : path;

  // Main path: Cloudflare R2 (when the server is set up for it).
  if (r2Available !== false) {
    if (/^image\/(heic|heif)$/.test(contentType)) {
      throw new Error("That photo format isn't supported. Please choose a JPG or PNG photo.");
    }
    const r2Url = await uploadViaR2(user, folder, toSend, contentType, onProgress);
    if (r2Url) {
      uploadedUrls.set(file, r2Url);
      return r2Url;
    }
  }

  // Fallback: Cloudinary (used only until R2 is set up on the server).
  const isAudio = contentType.startsWith("audio/");
  const kind = contentType.startsWith("video/") || isAudio ? "video" : "image";
  const endpoint = (cloudName: string) => `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`;

  const rawUrl = toSend.size > CHUNK_THRESHOLD
    ? await uploadInChunks(user, folder, toSend, endpoint, onProgress)
    : await uploadWhole(user, folder, toSend, endpoint, onProgress);

  const finalUrl = deliveryUrl(rawUrl, kind, isAudio);
  uploadedUrls.set(file, finalUrl);
  return finalUrl;
}

/** Same as uploadImage — just a clearer name for non-image files like video clips. */
export const uploadFile = uploadImage;

/** Uploads several files in parallel under the same folder path prefix. */
export async function uploadImages(pathPrefix: string, files: File[]): Promise<string[]> {
  return Promise.all(
    files.map((file, i) => uploadImage(`${pathPrefix}/${Date.now()}-${i}-${safeName(file.name)}`, file))
  );
}

/** Basic client-side guardrails matching the Storage rules (10MB images). */
export function validateImageFile(file: File): string | null {
  if (!isImageFile(file)) return "Only image files are supported.";
  // Big camera photos are shrunk automatically before upload, so allow a
  // generous original size here; the 10MB cap is enforced after shrinking.
  if (file.size > 60 * 1024 * 1024) return "Images must be under 60MB.";
  return null;
}

/**
 * Validates a video file client-side: type, file size, and — since reading
 * duration requires actually loading the file's metadata in the browser —
 * this returns a Promise. Default caps: 3 minutes, 95MB (scaled up from
 * the old 2-minute/150MB caps so a full-length clip still fits at the same
 * quality), matching the Storage rules' 95MB video limit.
 */
export function validateVideoFile(file: File, maxSeconds = 180, maxSizeMB = 95): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isVideoFile(file)) {
      resolve("Only video files are supported.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      resolve(`Videos must be under ${maxSizeMB}MB.`);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    let resolved = false;

    function finish(result: string | null) {
      if (resolved) return;
      resolved = true;
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    }

    function checkDuration() {
      if (!isFinite(video.duration) || video.duration <= 0) {
        // Some encoders (common with certain Android camera apps) report
        // Infinity until the player actually seeks into the file — forcing
        // a seek makes the browser recalculate the real duration. Without
        // this, those legitimately valid videos get wrongly rejected.
        video.currentTime = Number.MAX_SAFE_INTEGER;
        return;
      }
      if (video.duration > maxSeconds) {
        finish(`Videos must be ${maxSeconds} seconds or shorter (this one is ${Math.round(video.duration)}s).`);
      } else {
        finish(null);
      }
    }

    video.onloadedmetadata = checkDuration;
    video.ondurationchange = checkDuration;
    video.onseeked = checkDuration;
    // Many phone videos (HEVC/H.265, some .mov/.3gp) can't be decoded by the
    // browser's preview player even though they're perfectly valid. Cloudinary
    // converts them on upload, so never reject on a preview error — the size
    // cap above still applies, and the server enforces its own limits.
    video.onerror = () => finish(null);

    // Safety net — if none of the above ever fires for some reason, don't
    // leave the composer stuck on "Checking video…" forever.
    // The length cap is a courtesy check — if the phone is slow to read a big file, let it through (the size cap still applies).
    setTimeout(() => finish(null), 8000);

    video.src = objectUrl;
  });
}


/** Thumbnail (first frame) for a Cloudinary video URL, so the player shows a picture before it is played. */
export function videoPoster(url: string): string | undefined {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return undefined;
  return url.replace(/\/upload\/[^/]+\//, "/upload/so_0,f_jpg,q_auto,w_1000/").replace(/\.[A-Za-z0-9]+$/, ".jpg");
}
