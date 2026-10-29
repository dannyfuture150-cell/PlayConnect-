import { STAR_RULES } from "@/lib/starsCatalog";

/**
 * The PlayConnect Bot: answers common questions from a fixed list (no AI, no database, no cost).
 * To teach it something new, add an entry below.
 */
export interface BotAnswer {
  id: string;
  /** "app" = how to use PlayConnect (default). "gaming" = tips about the games. */
  group?: "app" | "gaming";
  /** Short label shown on the suggestion chips. */
  topic: string;
  /** Words or phrases that point to this answer. */
  keywords: string[];
  answer: string;
  link?: { label: string; href: string };
}

export const BOT_ANSWERS: BotAnswer[] = [
  {
    id: "join",
    topic: "Join a tournament",
    keywords: ["join", "enter", "sign up", "register", "how to play in", "take part"],
    answer:
      "Open the Tournaments tab, tap an organiser, pick a tournament and tap Join. Free tournaments let you in straight away. If a tournament has an entry fee paid to the organiser, you send a join request and the organiser approves it. If it costs PlayCoins, the coins are held safely and paid to the organiser only when the bracket starts.",
    link: { label: "Open Tournaments", href: "/tournaments" },
  },
  {
    id: "leave",
    topic: "Leave a tournament",
    keywords: ["leave", "quit", "withdraw", "pull out", "cancel entry", "refund"],
    answer:
      "You can leave a tournament any time before the organiser starts the bracket, and a PlayCoins entry fee is refunded to you. Once the bracket has started, nobody can leave, so that matches stay fair.",
  },
  {
    id: "score",
    topic: "Submit a score",
    keywords: ["score", "result", "submit", "report", "screenshot", "i won", "i lost", "proof"],
    answer:
      "Open your tournament, find your match in the bracket and tap it, then choose Submit result. Enter the score and add a screenshot of the final screen. The organiser checks it and approves it, then the winner moves to the next round. Both players should keep the screenshot until it is approved.",
    link: { label: "Open Tournaments", href: "/tournaments" },
  },
  {
    id: "earn",
    topic: "Earn PlayCoins",
    keywords: ["earn", "get coins", "get playcoins", "free coins", "how do i get", "streak", "daily", "mission"],
    answer: `You earn PlayCoins by: opening the app each day (${STAR_RULES.daily} a day, +${STAR_RULES.streakBonus} on every 7th day in a row, +${STAR_RULES.streakBigBonus} on every 30th), joining a tournament (${STAR_RULES.join}), winning one (${STAR_RULES.win}), finishing weekly missions, and inviting friends (${STAR_RULES.referrer} when a friend you invited joins their first tournament). Coins are added automatically, which can take a few minutes after you open the app.`,
    link: { label: "Open PlayCoins", href: "/stars" },
  },
  {
    id: "spend",
    topic: "Spend PlayCoins",
    keywords: ["spend", "buy", "redeem", "frame", "badge", "what can i do with", "store", "unlock"],
    answer: `Open the PlayCoins page to spend them on profile frames, card styles, titles, name colours and banners. Bigger unlocks: Chat Customiser (200) lets you pick your chat bubble colour and wallpaper, and Profile Background (200) puts a colour or your own photo behind your profile. A Streak Shield costs ${STAR_RULES.shieldPrice} and saves your streak if you miss a day.`,
    link: { label: "Open PlayCoins", href: "/stars" },
  },
  {
    id: "send",
    topic: "Send PlayCoins",
    keywords: ["send coins", "send playcoins", "give coins", "transfer", "gift"],
    answer: `You can send PlayCoins to another player from the PlayCoins page. Both of you must have joined at least ${STAR_RULES.sendMinTournaments} tournament and made at least ${STAR_RULES.sendMinPosts} posts. You can send up to ${STAR_RULES.sendMax} at a time and ${STAR_RULES.sendDailyLimit} a day. Double-check the username, because coins sent can't be taken back.`,
    link: { label: "Open PlayCoins", href: "/stars" },
  },
  {
    id: "whatcoins",
    topic: "What are PlayCoins?",
    keywords: ["what are playcoins", "what is playcoins", "what are coins", "playcoins", "coins", "playstars"],
    answer:
      "PlayCoins are PlayConnect's points. You earn them by being active and winning, and spend them on profile frames, card styles, titles, banners, the chat customiser and more. You can also use them for some tournament entries and in the shop. Ask me “how do I earn PlayCoins?” or “how do I spend PlayCoins?” for the details.",
    link: { label: "Open PlayCoins", href: "/stars" },
  },
  {
    id: "create",
    topic: "Create a tournament",
    keywords: ["create", "host", "organise", "organize", "start a tournament", "make a tournament", "organiser", "organizer"],
    answer: `Only organiser accounts can create tournaments. Go to the Tournaments tab and tap Create. It costs ${STAR_RULES.createTournamentFee} PlayCoins each time. Your account type is chosen when you sign up. If you need it changed, message an admin.`,
    link: { label: "Open Tournaments", href: "/tournaments" },
  },
  {
    id: "sell",
    topic: "Sell in the shop",
    keywords: ["sell", "shop", "listing", "post an item", "seller"],
    answer: `Open the Shop tab and post what you're selling. Listing costs ${STAR_RULES.sellFee} PlayCoins. When someone buys with PlayCoins, the coins are held until they confirm they received it (or ${STAR_RULES.shopAutoReleaseDays} days after you mark it delivered), then they're paid to you minus a ${STAR_RULES.shopFeePercent}% fee.`,
    link: { label: "Open Shop", href: "/shop" },
  },
  {
    id: "gameid",
    topic: "Add my game ID",
    keywords: ["game id", "konami", "gamertag", "psn", "ea id", "connect game", "connect my game", "username in game", "in-game"],
    answer:
      "Go to Settings, then Edit profile, then Connect your games. Pick your platform and type your in-game name for eFootball, EA FC or Mortal Kombat. Organisers and opponents can see it so they can add you.",
    link: { label: "Open Settings", href: "/settings" },
  },
  {
    id: "quick",
    topic: "Play 1v1 now",
    keywords: ["1v1", "quick match", "play now", "find opponent", "opponent", "random match", "play someone"],
    answer:
      "Tap the glowing Play 1v1 Now button at the top of the feed, pick a game and tap Find an opponent. When another player also taps it, you're matched straight away. Play your game, then tap I won or I lost and your opponent confirms. Quick matches don't pay PlayCoins.",
    link: { label: "Go to the feed", href: "/feed" },
  },
  {
    id: "challenge",
    topic: "Challenge a player",
    keywords: ["challenge", "dare", "versus", "friendly"],
    answer: "Open a player's profile and tap Challenge. Pick the game and how many matches. They can accept or decline, and you both confirm the result afterwards.",
  },
  {
    id: "tag",
    topic: "Tag someone",
    keywords: ["tag", "mention", "@"],
    answer:
      "Type @ and the first letters of their username in a post, comment or chat. Pick them from the list that pops up. They get a notification and their name becomes a link to their profile.",
  },
  {
    id: "chat",
    topic: "Chat tips",
    keywords: ["sticker", "quick reply", "voice note", "chat tips", "new line", "next line", "customise chat", "customize chat", "bubble", "wallpaper"],
    answer:
      "In chats you can send stickers (the sticker button), photos, voice notes, and one-tap quick replies like Ready or GG. The Enter key starts a new line, so use the send button to send. With the Chat Customiser unlock (200 PlayCoins) you can choose your bubble colour and wallpaper.",
  },
  {
    id: "invite",
    topic: "Invite friends",
    keywords: ["invite", "refer", "referral", "friends", "share app", "bring"],
    answer: `Your invite link is on the PlayCoins page. You get ${STAR_RULES.referrer} PlayCoins when a friend you invited joins their first tournament, and they get ${STAR_RULES.referee} to start. You can earn this for up to ${STAR_RULES.maxReferrals} friends.`,
    link: { label: "Open PlayCoins", href: "/stars" },
  },
  {
    id: "notify",
    topic: "Turn on notifications",
    keywords: ["notification", "notifications", "alert", "alerts", "not getting", "push"],
    answer:
      "Tap Allow on the notification banner on the feed, or open Settings and turn notifications on. Your phone must also allow notifications for your browser or the installed app.",
    link: { label: "Open Settings", href: "/settings" },
  },
  {
    id: "install",
    topic: "Install the app",
    keywords: ["install", "home screen", "add to home", "app store", "download"],
    answer:
      "Open the Settings page and choose the App tab for the install steps. On most phones: open PlayConnect in Chrome (or Safari on iPhone), tap the browser menu, then Add to Home screen.",
    link: { label: "Install steps", href: "/settings?tab=app" },
  },
  {
    id: "report",
    topic: "Report a problem",
    keywords: ["report", "cheat", "cheating", "abuse", "harass", "fake", "scam", "block", "bad player"],
    answer:
      "Open the player's profile and use the Report button, and tell the organiser of your tournament. For a scam or cheating, include a screenshot. Admins look at reports.",
  },
  {
    id: "rank",
    topic: "Ranks and leaderboard",
    keywords: ["rank", "leaderboard", "level", "ranking", "points"],
    answer:
      "Your rank goes up as you gain followers, make posts and win tournaments. The Leaderboard shows top players for each game. Organisers rank up by running tournaments that finish successfully.",
    link: { label: "Open Leaderboard", href: "/leaderboard" },
  },

  {
    id: "about",
    topic: "What is PlayConnect?",
    keywords: ["what is playconnect", "about playconnect", "what is this app", "what is this", "what's playconnect", "whats playconnect", "what does playconnect", "what can i do", "what can you do", "features", "playconnect"],
    answer:
      "PlayConnect is where gamers connect. You build a player profile and card, post to the feed and stories, chat with players and groups, join tournaments and leagues, challenge other players to 1v1 matches, and earn PlayCoins to spend on profile looks and extras. It's built for eFootball, EA FC and Mortal Kombat players.",
  },
  {
    id: "free",
    topic: "Is it free?",
    keywords: ["free", "cost", "price", "pay to join", "how much", "money", "fee", "fees"],
    answer:
      "Signing up and using PlayConnect is free. Some tournaments have an entry fee that the organiser sets, and that's shown on the tournament before you join. PlayCoins are earned by playing and being active, and you spend them on optional extras.",
  },
  {
    id: "start",
    topic: "Getting started",
    keywords: ["get started", "getting started", "new here", "just joined", "first time", "where do i start", "how do i start", "how to start", "how does it work", "how does this work", "how does this app work", "how do i use", "how to use"],
    answer:
      "A good start: add a profile photo and your game ID in Settings, tap Play 1v1 Now on the feed or join a tournament from the Tournaments tab, and make a few posts. The “Get set up” list on the feed ticks these off for you. Open the PlayCoins page to see how to earn coins.",
    link: { label: "Open Tournaments", href: "/tournaments" },
  },

  /* ---------- gaming tips (general advice that stays true after game updates) ---------- */
  {
    id: "g-defend",
    group: "gaming",
    topic: "Defending tips",
    keywords: ["defend", "defending", "defence", "defense", "tackle", "stop attacks", "concede", "conceding", "goals against"],
    answer:
      "Most goals are conceded by over-pressing. Don't hold the tackle button. Jockey (stay in front of the attacker), keep your defenders back in shape, and wait for the attacker to make a mistake or a bad touch before you step in. Switch to the defender closest to the ball, and only send a second player in when you're sure of winning it.",
  },
  {
    id: "g-attack",
    group: "gaming",
    topic: "Scoring tips",
    keywords: ["score more", "scoring", "finish", "finishing", "shoot", "shooting", "attack", "attacking", "more goals", "miss chances", "miss shots"],
    answer:
      "Be patient: build the attack with short passes until you have space in the box, then take a calm, aimed shot instead of shooting from far out. Low shots into the corners beat the keeper more often than power shots. Look for cut-backs and through balls behind the defence, and don't rush a chance when you're under no pressure.",
  },
  {
    id: "g-passing",
    group: "gaming",
    topic: "Passing and keeping the ball",
    keywords: ["pass", "passing", "possession", "keep the ball", "lose the ball", "losing the ball", "through ball", "build up"],
    answer:
      "Short, simple passes keep the ball safely. Avoid long balls when you're under pressure in your own half. Pass to a player who has space, move your players into gaps first, and use one-twos to get past a defender. Slow the game down when you're ahead and speed up when you need a goal.",
  },
  {
    id: "g-formation",
    group: "gaming",
    topic: "Formations and tactics",
    keywords: ["formation", "tactic", "tactics", "lineup", "line up", "squad", "best team", "playstyle", "play style", "meta"],
    answer:
      "The best formation depends on your players and how you like to play, and what's strongest changes with game updates. As a starting point: 4-3-3 is balanced and attacking, 4-2-3-1 is solid in midfield, and 4-4-2 is simple and easy to learn. Pick one, learn it well, and practise before the match instead of changing every game. Ask other players or your organiser what's working this season.",
  },
  {
    id: "g-lag",
    group: "gaming",
    topic: "Lag and connection",
    keywords: ["lag", "laggy", "connection", "disconnect", "disconnected", "ping", "wifi", "internet", "delay", "freeze", "freezing", "network"],
    answer:
      "To reduce lag: use a strong Wi-Fi close to the router (or a cable on console), close other apps and downloads, restart the game before your match, and ask the other player to do the same. On mobile data, play where the signal is strong. If a match disconnects, take a screenshot of the score and time and tell your organiser straight away. They decide whether to replay.",
  },
  {
    id: "g-practice",
    group: "gaming",
    topic: "How to improve",
    keywords: ["improve", "get better", "practice", "practise", "train", "training", "beginner", "newbie", "learn", "warm up", "warm-up", "tips"],
    answer:
      "Practise a little every day instead of a lot once a week. Use the game's practice or training mode to learn controls, play against the CPU to warm up before a match, and watch your replays to see how you conceded. Pick one thing to work on each session, like defending or passing, and play real opponents often because that's where you improve fastest. Play 1v1 Now on the feed is a quick way to find one.",
  },
  {
    id: "g-mk",
    group: "gaming",
    topic: "Mortal Kombat basics",
    keywords: ["mortal kombat", "mk", "combo", "combos", "fatal blow", "fighting game", "block", "blocking", "punish", "fighter"],
    answer:
      "In Mortal Kombat, learn to block first: you can't win if you're always getting hit. Learn two or three short combos that you can do every time instead of long ones you drop. Don't spam the same move because good players will block and punish it. Use practice mode to learn your character's moves, and when you block a slow move, hit back straight away.",
  },
  {
    id: "g-sport",
    group: "gaming",
    topic: "Fair play and sportsmanship",
    keywords: ["sportsmanship", "fair play", "rage", "toxic", "salty", "tilt", "tilted", "angry", "gg", "etiquette", "respect"],
    answer:
      "Play fair, say GG after the match whether you win or lose, and keep the chat friendly. If you're getting angry after a loss, take a short break before your next game because you play worse when frustrated. Don't quit mid-match or argue in the chat. Send the proof to the organiser and let them decide.",
  },
  {
    id: "g-update",
    group: "gaming",
    topic: "Game updates and settings",
    keywords: ["update", "updated", "patch", "version", "controls", "settings", "controller", "sensitivity", "setup"],
    answer:
      "Update your game before a tournament match so you and your opponent are on the same version. Set up your controls and settings in practice mode, not during a real match. Use settings you're comfortable with and don't change them right before a big game.",
  },
];

export const BOT_GREETING =
  "Hi, I'm the PlayConnect Bot 🤖. Ask me how PlayConnect works (“how do I join a tournament?”) or for gaming tips (“how do I defend better?”). Or tap a quick question below.";

export const BOT_FALLBACK =
  "I'm not sure about that one. Try asking in different words, or tap a topic below. If it's something else, ask your tournament organiser or message an admin.";

const GREETINGS = ["hi", "hello", "hey", "yo", "good morning", "good afternoon", "good evening", "sup"];
const THANKS = ["thanks", "thank you", "thx", "cheers"];

/** Picks the best answer for what the player typed. Returns null if nothing fits. */
export function answerFor(input: string): { text: string; link?: BotAnswer["link"] } | null {
  const q = ` ${input.toLowerCase().replace(/[^a-z0-9@\s-]/g, " ").replace(/\s+/g, " ").trim()} `;
  if (q.trim().length === 0) return null;
  if (THANKS.some((t) => q.includes(` ${t} `) || q.includes(` ${t}`))) return { text: "You're welcome! 🎮 Ask me anything else." };
  if (GREETINGS.some((g) => q.trim() === g || q.startsWith(` ${g} `))) return { text: BOT_GREETING };

  let best: { a: BotAnswer; score: number } | null = null;
  for (const a of BOT_ANSWERS) {
    let score = 0;
    for (const k of a.keywords) {
      if (q.includes(k.includes(" ") || k === "@" ? k : ` ${k}`)) score += k.includes(" ") ? 2 : 1; // phrases count for more
    }
    if (score > 0 && (!best || score > best.score)) best = { a, score };
  }
  return best ? { text: best.a.answer, link: best.a.link } : null;
}
