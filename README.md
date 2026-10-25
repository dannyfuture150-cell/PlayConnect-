# PlayConnect

**Connect. Compete. Conquer.** A social network built for gamers — feed, player profiles, communities, and tournaments.

This repo is a real, running Next.js + Firebase application. What's built below is fully functional against a live Firebase project (not placeholder UI) — you can sign up, complete onboarding, post to a feed, like/comment in real time, and edit a public profile today. The remaining features in the original brief (stories, DMs, communities, tournaments, admin dashboard, notifications, explore/search) are scaffolded in the schema and security rules but not yet built as UI — see **Roadmap** below for the recommended build order.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS, hand-rolled shadcn-style UI primitives
- Firebase Authentication, Firestore, Storage
- TanStack Query (React Query) for data fetching/caching
- React Hook Form + Zod for forms and validation
- Deployed to Vercel

## What's working right now

- **Auth**: email/password sign-up & login, Google sign-in, forgot-password, protected routes via `AuthGuard`
- **Light + dark themes**: white/blue by default, with a navy dark mode toggle (navbar icon or Settings → Account).
- **Onboarding**: username (uniqueness-checked), display name, country, platform, favorite games, bio
- **Profiles**: public profile page at `/profile/[username]`, player card, edit-profile in Settings, avatar/banner upload
- **Feed**: create posts with real image uploads (up to 10 per post, 15MB each) or a single video clip (up to 3 minutes, 225MB), infinite-scroll timeline, like/unlike, live comments
- **Follows**: real follow/unfollow with live counts, notifies the followed user
- **Notifications**: real per-user feed — likes, comments, and follows all generate one; polling-refreshed list at `/notifications`
- **Communities**: create, list, join/leave, detail page at `/communities/[slug]`
- **Tournaments**: create with format/max players/start time, list, join/leave at `/tournaments`
- **Messages**: real 1:1 direct messaging with a thread inbox and live chat window
- **Explore**: suggested players, popular communities, trending posts — all real Firestore queries
- **Mobile bottom nav**: Feed / Explore / Groups / Events / Chat, since the sidebar is desktop-only
- **Firestore security rules** and **Storage rules** covering the entire schema
- **Composite indexes** (`firestore.indexes.json`) for every query currently in use

## Still not built (real gaps, not just "coming soon" copy)

- **Stories** (24h media) — schema and rules exist, no UI yet
- **Admin dashboard** — `isAdmin` flag exists on user docs, no `/admin` route yet
- **Search** — Firestore alone can't do full-text search well; would need Algolia/Typesense
- **Tournament brackets** — join/leave works, but no actual bracket generation/scoring yet
- **Real-time updates** for notifications and messages currently poll/re-fetch rather than push instantly (no `onSnapshot` wired on those two yet — feed likes/comments do use live listeners)


## Project structure

```
src/
  app/
    (auth)/           login, signup, forgot-password, onboarding
    (main)/            feed, profile/[username], settings — wrapped in AuthGuard
    layout.tsx          fonts, providers, metadata
    page.tsx             public landing page
  components/
    auth/                auth forms + shell
    feed/                post composer, post card, comments, feed list
    profile/             player card, profile header, edit-profile form
    layout/              navbar, sidebar
    shared/               logo, chip multi-select, auth guard, loader
    ui/                    button, input, card, avatar, dialog, label, textarea
  hooks/                 useAuthActions, usePosts, useComments, useProfile
  lib/
    firebase/client.ts    Firebase SDK init
    validations/          Zod schemas
    countries.ts, utils.ts
  providers/              AuthProvider, QueryProvider
  types/index.ts          Firestore data model
firestore.rules
firestore.indexes.json
storage.rules
```

## Firestore data model

| Collection | Shape | Notes |
|---|---|---|
| `users/{uid}` | `UserProfile` | Public profile doc; `onboardingComplete` gates access to `/feed` etc. |
| `usernames/{username}` | `{ uid }` | Reservation doc enforcing unique usernames without scanning `users`. |
| `posts/{postId}` | `Post` | Denormalizes author info (`author`) so the feed never needs a join. |
| `posts/{postId}/likes/{uid}` | `Like` | One doc per liker; existence = liked. |
| `posts/{postId}/comments/{commentId}` | `Comment` | Ordered by `createdAt` ascending. |
| `stories/{storyId}` | `Story` | Has `expiresAt`; pair with a scheduled Cloud Function or client-side filter to hide expired stories. |
| `followers/{uid}/list/{followerId}` | `FollowEdge` | `uid` is who's followed, `followerId` is who's following. |
| `threads/{threadId}/messages/{messageId}` | — | `threadId` should encode both UIDs (e.g. `uidA_uidB`, sorted) so rules can check membership. |
| `communities/{communityId}` | `Community` | Moderator list controls write access. |
| `tournaments/{tournamentId}` | `Tournament` | `participantIds` array; rules allow join-only updates. |
| `notifications/{uid}/items/{id}` | `AppNotification` | Per-user subcollection; only the owner can read/mark-read. |
| `reports/{reportId}` | `Report` | Write-only for reporters, read/resolve for admins. |
| `badges/{badgeId}` | `Badge` | Admin-managed catalog referenced by `users.badges: string[]`. |

`isAdmin` is a boolean on the `users` doc; set it manually in the Firebase console (or a Cloud Function) for staff accounts — there's no self-serve way to become an admin, by design.

## Setup

1. **Create a Firebase project** at console.firebase.google.com.
2. Enable **Authentication** → Email/Password and Google providers.
3. Create a **Firestore** database (production mode, pick a region).
4. Enable **Storage**.
5. In Project Settings → General, create a Web App and copy the config values into `.env.local` (copy `.env.local.example` first).
6. Install dependencies and run locally:
   ```bash
   npm install
   npm run dev
   ```
7. Deploy security rules and indexes with the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore storage   # point at this repo, keep existing rules files
   firebase deploy --only firestore:rules,firestore:indexes,storage:rules
   ```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel → New Project.
3. Add the same environment variables from `.env.local` in Vercel's Project Settings → Environment Variables.
4. Deploy. Next.js App Router works out of the box on Vercel with no extra config.

## Cloud Functions (push notifications + story cleanup — needs real setup, not just a rules paste)

Unlike everything else in this project, these need actual server-side code (Cloud Functions) — that can't be pasted into the Firebase Console the way Firestore/Storage rules can. There are two functions, both in `functions/src/index.ts`, deployed together with one command:

- **`sendPushOnNotification`** — turns an in-app notification into a real push (see below)
- **`cleanupExpiredStories`** — runs once a day and actually deletes stories (Firestore doc + the photo/video in Storage) once they pass 24 hours old. The feed already *hides* expired stories without this — this function is what stops them from silently sitting in the database and Storage forever, unused. Needs the Blaze plan like everything else here, but Cloud Scheduler's free tier covers this easily (3 free jobs/project; this is one job running once a day).

Here's the full setup:

1. **Upgrade to the Blaze plan.** Firebase Console → your project → the "Spark" plan badge (usually bottom-left) → Upgrade. You'll add a payment method, but Cloud Functions' free tier (2M invocations/month) means this realistically costs $0 at this app's scale — see the in-app conversation history if you want the full breakdown of what's actually metered.
2. **Generate a VAPID key.** Firebase Console → ⚙️ Project Settings → **Cloud Messaging** tab → **Web Push certificates** → **Generate key pair**. Copy the resulting key.
3. **Add it as an env var.** In Vercel → your project → Settings → Environment Variables, add `NEXT_PUBLIC_FIREBASE_VAPID_KEY` with that value, then redeploy.
4. **Deploy the Cloud Function.** This is the part that needs a terminal — either:
   - **A computer:** `npm install -g firebase-tools`, then `firebase login`, then from this project's root: `cd functions && npm install && cd .. && firebase deploy --only functions`
   - **No computer? Use Google Cloud Shell** (console.cloud.google.com → the `>_` icon top-right) — it's a full terminal that runs in your browser, works fine on a phone. Upload this project (or clone it from GitHub if you've connected one), then run the same commands as above.
5. Try it: Settings → Notifications → "Enable push notifications" on your device, then have another account like/follow/message that account. A real OS-level push should show up even with the tab closed.

**Everything else in this project (Firestore rules, Storage rules, deploying the app itself) stays exactly the same drag-and-drop / Console-paste process as before.** Only this one feature needs the CLI, because Cloud Functions genuinely don't have a paste-into-a-textbox deployment path.

## Admin panel (`/admin`)

A scoped admin dashboard — users list with search/filter, ban/unban, and permanently deleting an account. Deliberately doesn't include ads, payments/revenue, verification queues, or role-based permissions beyond a single admin flag — those would need entirely new subsystems (an ad system, a payment processor, etc.) to be anything more than a fake page with no real data behind it.

**Granting yourself admin access** (no in-app way to do this, on purpose — self-service "make me admin" buttons are a real security hole):
1. Firebase Console → Firestore Database → `users` collection → find your own user document (the doc ID is your Firebase Auth UID — check Authentication tab if unsure which one is you)
2. Add a field: `isAdmin` → type **boolean** → value **true**
3. Reload the app — an "Admin" link now appears in your account menu (top-right avatar), and `/admin` is reachable

**What Ban vs Delete actually do:**
- **Ban** sets `isBanned: true` and is fully enforced — a banned user is signed out and blocked from using the app at all until unbanned. Reversible.
- **Delete** permanently removes their PlayConnect profile and frees up their username — but can *not* revoke their underlying Firebase login, since that requires the Admin SDK (a Cloud Function), not something the client can do to another user's account. In practice this means they could still technically sign in, but would land back in onboarding with no profile, posts, followers, or history. For actually blocking someone, Ban is the complete action; Delete is for wiping a profile's data permanently.

## Roadmap (in the order I'd build them)

1. ~~**Stories** — 24h media with a `viewers` array; filter expired stories client-side or with a scheduled Cloud Function cleanup.~~ Done — expired stories are filtered from the feed client-side *and* actually deleted (doc + Storage file) by a daily scheduled Cloud Function.
2. **Real-time notifications & messages** — swap the current polling/re-fetch pattern for `onSnapshot` listeners (same pattern already used for feed likes/comments).
3. **Search** — needs either Firestore's limited query support (prefix search on `username`) or a search service like Algolia/Typesense for full-text search across users, games, and communities.
4. **Tournament brackets** — the heaviest lift; join/leave already works, bracket generation and match scoring do not.
5. **Admin dashboard** — a `/admin` route gated on `profile.isAdmin`, surfacing `reports` and moderation actions.

Each of these slots into the existing schema, rules, and component patterns without restructuring what's already built.
