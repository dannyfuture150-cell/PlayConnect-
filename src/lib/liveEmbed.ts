export type LivePlatform = "youtube" | "twitch" | "facebook" | "tiktok" | "other";

export interface ParsedLive {
  platform: LivePlatform;
  url: string;
  /** Video id (YouTube) or channel name (Twitch); null when the platform can't be embedded. */
  ref: string | null;
}

/** Works out which platform a pasted live link is from. Returns null if it isn't a valid web link. */
export function parseLiveUrl(input: string): ParsedLive | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && parts[0]) return { platform: "youtube", url: u.toString(), ref: parts[0] };
  if (host.endsWith("youtube.com")) {
    const v = u.searchParams.get("v");
    if (v) return { platform: "youtube", url: u.toString(), ref: v };
    if ((parts[0] === "live" || parts[0] === "embed" || parts[0] === "shorts") && parts[1])
      return { platform: "youtube", url: u.toString(), ref: parts[1] };
    return { platform: "youtube", url: u.toString(), ref: null };
  }
  if (host.endsWith("twitch.tv") && parts[0]) return { platform: "twitch", url: u.toString(), ref: parts[0] };
  if (host.endsWith("facebook.com") || host === "fb.watch") return { platform: "facebook", url: u.toString(), ref: null };
  if (host.endsWith("tiktok.com")) return { platform: "tiktok", url: u.toString(), ref: null };
  return { platform: "other", url: u.toString(), ref: null };
}

/** Player URL to put in an iframe, or null if this platform must be opened in its own app. */
export function embedSrc(platform: LivePlatform, url: string, ref: string | null, hostname: string): string | null {
  if (platform === "youtube" && ref) return `https://www.youtube.com/embed/${encodeURIComponent(ref)}?autoplay=1&playsinline=1`;
  if (platform === "twitch" && ref)
    return `https://player.twitch.tv/?channel=${encodeURIComponent(ref)}&parent=${encodeURIComponent(hostname)}&autoplay=true`;
  if (platform === "facebook")
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  return null;
}

export const PLATFORM_LABEL: Record<LivePlatform, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  facebook: "Facebook",
  tiktok: "TikTok",
  other: "Link",
};
