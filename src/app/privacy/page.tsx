import Link from "next/link";

export const metadata = { title: "Privacy Policy – PlayConnect" };

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-8 text-lg font-bold text-foreground">{children}</h2>
);

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl bg-background px-5 py-10 text-sm leading-relaxed text-foreground">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-steel/60">Last updated: October 2026</p>
      <p className="mt-4">
        PlayConnect is a social network for gamers. This page explains what information we collect, why, and the control you have over it.
      </p>

      <H>What we collect</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Account details: email address, display name, username, password (stored securely by Firebase Authentication), and your Google profile if you sign in with Google.</li>
        <li>Profile details you add: photo, banner, bio, gaming IDs and social links.</li>
        <li>Content you post: posts, photos, videos, stories, comments, group and direct messages, tournament screenshots.</li>
        <li>Activity: who you follow, likes, tournaments and groups you join, and when you were last online (shown to other users).</li>
        <li>If you turn on notifications, a token that lets us send push alerts to your device.</li>
      </ul>

      <H>How we use it</H>
      <p className="mt-2">To run the app: show your profile and posts, deliver messages, run tournaments, show notifications, keep the service secure, and show sponsored ads from our advertisers. We do not sell your personal information.</p>

      <H>Who can see what</H>
      <p className="mt-2">Profiles, posts, followers and group member lists are visible to other signed-in users. Direct messages are visible only to the people in the conversation. Your email is never shown publicly.</p>

      <H>Services we use</H>
      <p className="mt-2">Google Firebase (sign-in, database, notifications), Cloudinary (photo and video storage), and Vercel (hosting). They process data on our behalf under their own privacy terms.</p>

      <H>Deleting your data</H>
      <p className="mt-2">You can permanently delete your account any time in <strong>Settings → Account → Delete account</strong>. This removes your profile, posts, stories, follows and group memberships. Some copies may remain briefly in backups. You can also email us to request deletion.</p>

      <H>Children</H>
      <p className="mt-2">PlayConnect is not meant for children under 13, and we do not knowingly collect their information.</p>

      <H>Contact</H>
      <p className="mt-2">Questions or deletion requests: <a className="text-violet-glow underline" href="mailto:kwesisallah130@gmail.com">kwesisallah130@gmail.com</a></p>

      <p className="mt-10"><Link href="/" className="text-violet-glow underline">← Back to PlayConnect</Link></p>
    </main>
  );
}
