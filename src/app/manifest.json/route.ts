// Dynamic manifest so the same codebase can be installed as either the main
// app or the admin-only site (NEXT_PUBLIC_ADMIN_ONLY=true).
const ADMIN_ONLY = process.env.NEXT_PUBLIC_ADMIN_ONLY === "true";

export async function GET() {
  const manifest = {
    name: ADMIN_ONLY ? "PlayConnect Admin" : "PlayConnect",
    short_name: ADMIN_ONLY ? "PC Admin" : "PlayConnect",
    description: ADMIN_ONLY
      ? "PlayConnect administration panel."
      : "Connect. Compete. Conquer. The social network built for gamers.",
    start_url: ADMIN_ONLY ? "/admin" : "/feed",
    id: "/",
    scope: "/",
    lang: "en",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0E0A18",
    theme_color: "#0E0A18",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-cache" },
  });
}
