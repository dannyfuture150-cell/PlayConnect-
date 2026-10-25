import { createHash, createHmac } from "crypto";

/**
 * Cloudflare R2 (S3-compatible) helpers, written against the plain AWS
 * Signature V4 rules so no extra packages are needed. Server-side only.
 * Needs these environment variables:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 */

export function r2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_URL
  );
}

const sha256hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding, as AWS requires (encodeURIComponent leaves !'()* unescaped). */
export const awsEncode = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** Encodes an object key / path, keeping "/" between segments. */
const encodePath = (p: string) => p.split("/").map(awsEncode).join("/");

const amzDate = (d: Date) => d.toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20130524T000000Z

function signingKey(secret: string, day: string, region: string, service: string) {
  return hmac(hmac(hmac(hmac("AWS4" + secret, day), region), service), "aws4_request");
}

function canonicalQuery(q: Record<string, string>) {
  return Object.keys(q)
    .map((k) => [awsEncode(k), awsEncode(q[k])] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

export interface SigTarget {
  host: string;
  path: string; // e.g. "/bucket/folder/file.jpg" (not encoded yet)
  region: string;
  service: string;
  accessKey: string;
  secretKey: string;
}

/** A URL a browser can use to PUT one object (or one part of a multipart upload) without having the secret. */
export function presignUrl(
  t: SigTarget,
  method: "PUT" | "GET",
  query: Record<string, string> = {},
  expiresSeconds = 3600,
  now = new Date()
): string {
  const date = amzDate(now);
  const day = date.slice(0, 8);
  const scope = `${day}/${t.region}/${t.service}/aws4_request`;
  const q: Record<string, string> = {
    ...query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${t.accessKey}/${scope}`,
    "X-Amz-Date": date,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": "host",
  };
  const cq = canonicalQuery(q);
  const canonical = [method, encodePath(t.path), cq, `host:${t.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", date, scope, sha256hex(canonical)].join("\n");
  const sig = createHmac("sha256", signingKey(t.secretKey, day, t.region, t.service)).update(toSign).digest("hex");
  return `https://${t.host}${encodePath(t.path)}?${cq}&X-Amz-Signature=${sig}`;
}

/** Headers for a request the server makes itself (start / finish a multipart upload). */
export function signHeaders(
  t: SigTarget,
  method: string,
  query: Record<string, string>,
  body: string,
  extraHeaders: Record<string, string> = {},
  now = new Date()
): Record<string, string> {
  const date = amzDate(now);
  const day = date.slice(0, 8);
  const scope = `${day}/${t.region}/${t.service}/aws4_request`;
  const payloadHash = sha256hex(body);
  const headers: Record<string, string> = {
    ...Object.fromEntries(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v.trim()])),
    host: t.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date,
  };
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonical = [method, encodePath(t.path), canonicalQuery(query), canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", date, scope, sha256hex(canonical)].join("\n");
  const sig = createHmac("sha256", signingKey(t.secretKey, day, t.region, t.service)).update(toSign).digest("hex");
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${t.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
  };
}

/* ---------- the actual R2 bucket ---------- */

function target(key: string): SigTarget {
  return {
    host: `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    path: `/${process.env.R2_BUCKET}/${key}`,
    region: "auto",
    service: "s3",
    accessKey: process.env.R2_ACCESS_KEY_ID as string,
    secretKey: process.env.R2_SECRET_ACCESS_KEY as string,
  };
}

export const r2PublicUrl = (key: string) => `${(process.env.R2_PUBLIC_URL as string).replace(/\/+$/, "")}/${encodePath(key)}`;

/** One-shot upload URL for a whole (smaller) file. */
export const r2PutUrl = (key: string) => presignUrl(target(key), "PUT", {}, 3600);

/** Upload URL for one piece of a big file. */
export const r2PartUrl = (key: string, uploadId: string, partNumber: number) =>
  presignUrl(target(key), "PUT", { partNumber: String(partNumber), uploadId }, 3600);

async function r2Request(key: string, method: string, query: Record<string, string>, body: string, contentType?: string) {
  const t = target(key);
  const headers = signHeaders(t, method, query, body, contentType ? { "content-type": contentType } : {});
  const url = `https://${t.host}${encodePath(t.path)}?${canonicalQuery(query)}`;
  const { host: _h, ...sendHeaders } = headers;
  void _h;
  const res = await fetch(url, { method, headers: sendHeaders, body: body || undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`R2 ${method} failed (${res.status}): ${text.slice(0, 200)}`);
  return text;
}

/** Starts a multipart upload and returns its id. */
export async function r2StartMultipart(key: string, contentType: string): Promise<string> {
  const xml = await r2Request(key, "POST", { uploads: "" }, "", contentType);
  const m = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
  if (!m) throw new Error("R2 did not return an upload id");
  return m[1];
}

/** Joins the uploaded pieces into the final file. */
export async function r2CompleteMultipart(key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]) {
  const body =
    "<CompleteMultipartUpload>" +
    parts
      .sort((a, b) => a.PartNumber - b.PartNumber)
      .map((p) => `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${p.ETag.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</ETag></Part>`)
      .join("") +
    "</CompleteMultipartUpload>";
  const xml = await r2Request(key, "POST", { uploadId }, body, "application/xml");
  if (/<Error>/.test(xml)) throw new Error("R2 could not finish the upload");
}

let credsOk = false;

/** Checks once that the keys, account id and bucket really work. Returns a short reason when they don't. */
export async function r2CheckCredentials(): Promise<string | null> {
  if (credsOk) return null;
  const t = { ...target("x"), path: `/${process.env.R2_BUCKET}` };
  const query = { "list-type": "2", "max-keys": "1" };
  try {
    const headers = signHeaders(t, "GET", query, "");
    const { host: _h, ...sendHeaders } = headers;
    void _h;
    const res = await fetch(`https://${t.host}${encodePath(t.path)}?${canonicalQuery(query)}`, { method: "GET", headers: sendHeaders });
    if (res.ok) {
      credsOk = true;
      return null;
    }
    const text = await res.text();
    const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? "";
    return `Storage setup problem: ${res.status} ${code}`.trim();
  } catch (e) {
    return `Storage setup problem: can't reach R2 (${(e as Error).message?.slice(0, 60) ?? "unknown"})`;
  }
}
