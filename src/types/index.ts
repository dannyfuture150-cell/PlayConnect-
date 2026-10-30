import { Timestamp } from "firebase/firestore";

export type GamingPlatform = "PC" | "PlayStation" | "Xbox" | "Mobile" | "Switch";

export type SkillLevel = "Rookie" | "Amateur" | "Pro" | "Elite" | "Legend";

/** users/{uid} */
export type AccountType = "player" | "organizer";

export interface UserProfile {
  uid: string;
  accountType: AccountType;
  /** True for accounts that chose their type at sign-up — it can no longer be changed. Absent on older accounts. */
  accountTypeLocked?: boolean;
  username: string; // unique, lowercase, used in URLs
  displayName: string;
  email: string;
  bio: string;
  photoURL: string | null;
  bannerURL: string | null;
  favoriteGames: string[];
  platform: GamingPlatform | null;
  skillLevel: SkillLevel;
  efootballId?: string;
  eaFcId?: string;
  mkId?: string; // Mortal Kombat online ID
  bloodStrikeId?: string; // Blood Strike player ID
  efootballPlatform?: GamingPlatform | "";
  eaFcPlatform?: GamingPlatform | "";
  mkPlatform?: GamingPlatform | "";
  bloodStrikePlatform?: GamingPlatform | "";
  discordUsername?: string;
  twitchUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  tournamentWins: number;
  gameWins: Record<string, number>; // e.g. { "EA FC": 3 } — powers per-game leaderboards
  // Organizer-only stats — only ever change if accountType is "organizer",
  // since only organizers can create tournaments/leagues at all.
  tournamentsOrganized: number;
  successfulTournamentsOrganized: number; // reached "completed" status (a champion was decided)
  leaguesOrganized: number;
  successfulLeaguesOrganized: number; // the full fixture list was played out
  savedPostIds: string[]; // bookmarked posts, newest-saved last
  communityHidden?: Record<string, number>; // communityId -> when this user removed the group from their chat list (they stay a member)
  communitySeenCounts?: Record<string, number>; // communityId -> announcementCount this user has already seen
  rankOverride?: SkillLevel | null; // set by an admin; replaces the automatic rank until cleared
  celebratedLevel?: SkillLevel; // last rank the user was congratulated for
  celebratedBadges?: string[]; // badges the user has already been congratulated for
  communityChatSeen?: Record<string, number>; // communityId -> time (ms) the user last read that group's chat
  reputationScore: number;
  badges: string[]; // simple label strings, earned automatically (e.g. "🏆 Tournament Champion")
  fcmTokens: string[]; // device push-notification tokens, opted in via Settings
  onboardingComplete: boolean;
  heardFrom?: string; // "How did you know PlayConnect?"
  referredBy?: string | null; // uid of the player who referred them
  referredByUsername?: string | null;
  isAdmin?: boolean;
  botMessagesOff?: boolean; // the player turned off messages from the PlayConnect Bot
  isBanned?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** posts/{postId} */
export interface Post {
  id: string;
  authorId: string;
  author: PostAuthorSnapshot;
  text: string;
  mediaUrls: string[];
  mediaType: "none" | "image" | "video" | "clip";
  gameTag?: string;
  /** Set when the post is a shared player card (shown as a small flippable card, not a photo). */
  card?: PlayerCardSnapshot;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  createdAt: Timestamp;
}

/** A player card frozen at the moment it was posted. */
export interface PlayerCardSnapshot {
  displayName: string;
  username: string;
  photoURL: string | null;
  rank: SkillLevel;
  reputation: number;
  platform: string | null;
  followers: number;
  wins: number;
  games: string[];
  headline?: string;
  tournamentTitle?: string;
  game?: string;
  /** A card style bought with stars (replaces the rank colours). */
  style?: string;
  /** A title bought with stars, e.g. "🔥 Clutch King". */
  title?: string;
}

/** Denormalized author info stored on the post for fast feed rendering */
export interface PostAuthorSnapshot {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

/** posts/{postId}/comments/{commentId} */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthorSnapshot;
  text: string;
  createdAt: Timestamp;
  /** Set on replies: the top-level comment this belongs to (replies are one level deep, like Instagram). */
  parentId?: string | null;
  /** Set on replies: author of the top-level comment (lets them moderate replies under it). */
  parentAuthorId?: string | null;
  /** Set on replies: who is being replied to (shown as @name). */
  replyTo?: { uid: string; displayName: string } | null;
}

/** posts/{postId}/likes/{uid} and other like subcollections use this shape */
export interface Like {
  uid: string;
  createdAt: Timestamp;
}

/** followers/{uid}/list/{followerId} */
export interface FollowEdge {
  uid: string;
  createdAt: Timestamp;
}

/** stories/{storyId} */
export interface Story {
  id: string;
  authorId: string;
  author: PostAuthorSnapshot;
  mediaUrl: string | null; // null for text stories
  storagePath: string | null; // the actual Storage object path — needed to delete the file once expired, since a download URL alone can't be deleted via the Admin SDK
  mediaType: "image" | "video" | "text";
  text?: string;
  fontFamily?: string;
  textColor?: string;
  backgroundStyle?: string; // CSS background value (solid color or gradient)
  viewers: string[];
  likes: string[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/** notifications/{uid}/items/{notificationId} */
export interface AppNotification {
  id: string;
  type: "like" | "comment" | "follow" | "message" | "tournament_invite" | "community_invite" | "trophy_win" | "result_submitted" | "result_approved" | "result_rejected" | "match_ready" | "spot_open" | "tournament_reminder" | "advanced" | "result_reversed" | "challenge" | "mention" | "coins" | "bot";
  text?: string; // the message, for type "bot"
  fromUid: string;
  fromUser: PostAuthorSnapshot;
  postId?: string;
  communityId?: string;
  tournamentId?: string;
  roundLabel?: string;
  leagueId?: string;
  link?: string | null;
  amount?: number;
  tournamentTitle?: string;
  prize?: string | null;
  game?: string;
  read: boolean;
  createdAt: Timestamp;
}

/** communities/{communityId} */
export interface Community {
  id: string;
  name: string;
  slug: string;
  game: string;
  description: string;
  photoURL: string | null;
  bannerURL: string | null;
  rules: string[];
  moderatorIds: string[];
  memberIds: string[];
  memberCount: number;
  lastAnnouncement?: string; // preview text of the newest announcement
  lastAnnouncementAt?: Timestamp;
  announcementCount?: number; // total announcements posted — drives members' unread badges
  lastChatAt?: Timestamp; // when the newest group-chat message was sent
  lastChatBy?: string; // who sent it
  lastChatText?: string; // preview of the newest group-chat message
  lastChatName?: string; // first name of whoever sent it
  chatMode?: "everyone" | "admins"; // who may send chat messages (default: admins)
  createdBy: string;
  createdAt: Timestamp;
}

/** communities/{communityId}/announcements/{announcementId} */
export interface CommunityAnnouncement {
  id: string;
  communityId: string;
  authorId: string;
  author: PostAuthorSnapshot;
  text: string;
  imageUrl: string | null;
  createdAt: Timestamp;
}

/** communities/{communityId}/chat/{messageId} */
export interface GroupMessage {
  id: string;
  authorId: string;
  author: PostAuthorSnapshot;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | null;
  mediaDuration?: number | null; // seconds, for voice notes
  sticker?: string | null; // id from lib/stickers
  replyTo?: { id: string; name: string; text: string } | null;
  createdAt: Timestamp;
}

/** threads/{threadId} — a DM conversation between exactly two users */
export interface Thread {
  id: string;
  participantIds: string[]; // always length 2
  participants: Record<string, PostAuthorSnapshot>; // uid -> snapshot, for rendering without extra lookups
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastSenderId: string;
  lastReadBy: Record<string, Timestamp>; // uid -> when that user last opened this thread
  messageCount: number;
  unreadCounts?: Record<string, number>; // uid -> unread messages waiting for that user
  clearedAt?: Record<string, Timestamp>; // uid -> when that user deleted the chat from their list
  createdAt: Timestamp;
}

/** threads/{threadId}/messages/{messageId} */
export interface DirectMessage {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "audio" | null;
  mediaDuration?: number | null; // seconds, for voice notes
  sticker?: string | null; // id from lib/stickers
  replyTo?: { id: string; name: string; text: string } | null;
  read: boolean;
  createdAt: Timestamp;
}

/** tournaments/{tournamentId} */
export interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string;
  organizerId: string;
  communityId?: string;
  format: "single_elimination" | "double_elimination" | "round_robin";
  maxParticipants: number;
  entryType: "free" | "paid" | "stars";
  starsFee?: number | null; // entry price in PlayCoins (entryType "stars")
  bracketStarted?: boolean; // set when the bracket is generated; players can no longer leave
  entryFee: string | null; // free-text (e.g. "$5", "500 coins") — no real payment processing, just a label
  prize: string | null; // free-text (e.g. "$100 cash", "Winner takes all")
  participantIds: string[];
  pendingParticipantIds: string[]; // paid-entry join requests awaiting organizer approval
  status: "upcoming" | "live" | "completed";
  startsAt: Timestamp;
  createdAt: Timestamp;
  winnerId?: string; // set when the final is played
  waitlistIds?: string[]; // people who want in once a spot opens
  reminderSentAt?: Timestamp; // the "starts today" reminder was sent
  soonReminderSentAt?: Timestamp; // the "starts in 30 mins" push was sent
  prizePaid?: boolean; // organiser marked the prize as paid
  prizePaidAt?: Timestamp;
  prizeConfirmed?: boolean; // the winner confirmed they received it
}

/** leagues/{leagueId} */
export interface League {
  id: string;
  name: string;
  game: string;
  description: string;
  creatorId: string;
  maxParticipants: number;
  entryType: "free" | "paid";
  entryFee: string | null;
  prize: string | null;
  teamsCount: number; // how many participants have actually joined so far
  matchesCount: number; // total fixtures once the schedule is generated (maxParticipants * (maxParticipants - 1))
  pendingParticipantIds: string[]; // paid-entry join requests awaiting organizer approval
  started: boolean; // true once the round-robin schedule has been generated (the league is then closed to new joins)
  matchdayDates?: Record<string, string>; // organiser-chosen START date for each matchday: { "1": "2026-11-05" }
  matchdayEnds?: Record<string, string>; // organiser-chosen END date for each matchday (the matchday stops being "live" after this day)
  createdAt: Timestamp;
}

/** leagues/{leagueId}/teams/{teamId} */
export interface LeagueTeam {
  id: string;
  leagueId: string;
  name: string;
  memberIds: string[];
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  createdAt: Timestamp;
}

/** leagues/{leagueId}/matches/{matchId} */
export interface LeagueMatch {
  id: string;
  leagueId: string;
  round: number; // "matchday" — which pass through the schedule this fixture belongs to
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  reportedBy: string | null;
  createdAt: Timestamp;
}
/** leagues/{leagueId}/results/{resultId} — a player's submitted fixture score + screenshot */
export interface LeagueResult {
  id: string;
  leagueId: string;
  matchId: string;
  submittedBy: string;
  submitter: PostAuthorSnapshot;
  homeScore: number;
  awayScore: number;
  imageUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}

/** tournaments/{tournamentId}/matches/{matchId} — one slot in a single-elimination bracket */
export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number; // 1 = first round
  slot: number; // position within the round, 0-indexed
  player1Id: string | null;
  player1: PostAuthorSnapshot | null;
  player2Id: string | null;
  player2: PostAuthorSnapshot | null;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  nextMatchId: string | null; // where the winner automatically advances to
  nextMatchSlotKey: "player1" | "player2" | null; // which slot in that next match
  isBye: boolean; // true if this match auto-advances one player with no opponent
  createdAt: Timestamp;
}

/** tournaments/{tournamentId}/results/{resultId} — a player's submitted score + screenshot, waiting for the organiser */
export interface MatchResult {
  id: string;
  tournamentId: string;
  matchId: string;
  submittedBy: string;
  submitter: PostAuthorSnapshot;
  player1Score: number;
  player2Score: number;
  imageUrl: string;
  status: "pending" | "approved" | "rejected" | "reversed";
  createdAt: Timestamp;
}

/** reports/{reportId} */
export interface Report {
  id: string;
  reporterId: string;
  targetType: "post" | "comment" | "user" | "community" | "organizer" | "story";
  targetUid?: string;
  targetId: string;
  reason: string;
  tournamentId?: string;
  tournamentTitle?: string;
  prize?: string | null;
  status: "open" | "reviewed" | "dismissed";
  createdAt: Timestamp;
}

/** badges/{badgeId} */
export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
}

/** lives/{liveId} — a live stream someone shared (hosted on YouTube/Twitch/etc.) */
export interface LiveStream {
  id: string;
  hostId: string;
  host: PostAuthorSnapshot;
  title: string;
  game: string;
  platform: "youtube" | "twitch" | "facebook" | "tiktok" | "other";
  url: string;
  ref: string | null;
  status: "live" | "ended";
  startedAt: Timestamp | null;
}

/** lives/{liveId}/chat/{messageId} */
export interface LiveChatMessage {
  id: string;
  authorId: string;
  author: PostAuthorSnapshot;
  text: string;
  createdAt: Timestamp | null;
}

/** ads/{id} — a sponsored placement managed from the admin site. */
export interface Ad {
  id: string;
  sponsor: string; // e.g. "GameZone Accra"
  title: string;
  text: string;
  imageUrl: string | null;
  linkUrl: string; // https:// destination
  ctaLabel: string; // button text, e.g. "Visit shop"
  placement: "feed" | "tournaments" | "both";
  active: boolean;
  endsAt: Timestamp | null; // optional last day
  impressions: number;
  clicks: number;
  createdAt: Timestamp;
}

/** tournaments/{id}/shots/{shotId} — a screenshot posted by a player in that tournament. */
export interface TournamentShot {
  id: string;
  tournamentId: string;
  authorId: string;
  author: PostAuthorSnapshot;
  imageUrl: string;
  caption: string;
  createdAt: Timestamp;
}

export type ShopCategory = "accounts" | "coins" | "consoles" | "controllers" | "accessories" | "other";

export interface ShopItem {
  id: string;
  sellerId: string;
  seller: PostAuthorSnapshot;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: ShopCategory;
  location?: string;
  imageUrls: string[];
  videoUrl?: string;
  /** Optional price in PlayCoins. Paid through the server and held until the buyer confirms. */
  starsPrice?: number | null;
  reservedBy?: string | null;
  sold: boolean;
  createdAt: unknown;
}

export type ChallengeStatus = "pending" | "accepted" | "declined" | "cancelled" | "reported" | "done";

/** challenges/{id} — a 1v1 match request between two players. */
export interface Challenge {
  id: string;
  challengerId: string;
  challenger: PostAuthorSnapshot;
  opponentId: string;
  opponent: PostAuthorSnapshot;
  participantIds: string[];
  game: string;
  bestOf: number;
  note: string;
  status: ChallengeStatus;
  /** Set when a player says who won; the other player then confirms or disputes. */
  reportedBy?: string;
  reportedWinnerId?: string;
  winnerId?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

/** shopOrders/{id} — a PlayCoins purchase in the shop, held until the buyer confirms. */
export interface ShopOrder {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage?: string | null;
  buyerId: string;
  buyer: PostAuthorSnapshot;
  sellerId: string;
  seller: PostAuthorSnapshot;
  participantIds: string[];
  price: number;
  status: "held" | "delivered" | "released" | "cancelled";
  deliveredAt?: { toMillis?: () => number } | null;
  createdAt: unknown;
}
