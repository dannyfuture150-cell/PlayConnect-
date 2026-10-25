import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { CHAT_BUBBLES, CHAT_WALLPAPERS, itemById, MISSIONS, PROFILE_BGS, STAR_RULES, STAR_SLOTS, type MissionProgress, type StarSlot } from "@/lib/starsCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * PlayCoins live here, on the server, so nobody can give themselves stars from
 * the app. Every award is idempotent: it is keyed (e.g. win_<tournamentId>)
 * and written to the log in the same transaction as the balance change, so
 * repeating a call can never pay twice. Needs FIREBASE_SERVICE_ACCOUNT.
 */

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

async function grant(db: Firestore, uid: string, key: string, amount: number, reason: string): Promise<boolean> {
  const stars = db.doc(`stars/${uid}`);
  const log = db.doc(`stars/${uid}/log/${key}`);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(log)).exists) return false;
    tx.set(log, { amount, reason, createdAt: FieldValue.serverTimestamp() });
    tx.set(stars, { balance: FieldValue.increment(amount), lifetime: FieldValue.increment(Math.max(0, amount)) }, { merge: true });
    return true;
  });
}

async function claimDaily(db: Firestore, uid: string) {
  const stars = db.doc(`stars/${uid}`);
  const day = today();
  const log = db.doc(`stars/${uid}/log/daily_${day}`);
  await db.runTransaction(async (tx) => {
    const [s, l] = await Promise.all([tx.get(stars), tx.get(log)]);
    if (l.exists) return;
    const d = s.data() ?? {};
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    let streak: number;
    let shields = Number(d.shields ?? 0);
    let shieldUsed = false;
    if (d.lastLoginDay === yesterday()) streak = (d.loginStreak ?? 0) + 1;
    else if (d.lastLoginDay === dayBefore && shields > 0) {
      // missed exactly one day: a Streak Shield keeps the streak alive
      streak = (d.loginStreak ?? 0) + 1;
      shields -= 1;
      shieldUsed = true;
    } else streak = 1;
    const bonus = (streak % 7 === 0 ? STAR_RULES.streakBonus : 0) + (streak % 30 === 0 ? STAR_RULES.streakBigBonus : 0);
    const amount = STAR_RULES.daily + bonus;
    tx.set(log, {
      amount,
      reason: (bonus ? `Daily login · ${streak}-day streak bonus` : "Daily login") + (shieldUsed ? " · Streak Shield used 🛡️" : ""),
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(stars, { balance: FieldValue.increment(amount), lifetime: FieldValue.increment(amount), lastLoginDay: day, loginStreak: streak, shields }, { merge: true });
  });
}

async function syncEarnings(db: Firestore, uid: string) {
  // Tournaments: 1 star for joining, a big bonus for winning.
  const ts = await db.collection("tournaments").where("participantIds", "array-contains", uid).limit(300).get();
  // Look up every reward key in ONE read and only pay the ones not paid yet (a long list used to time out).
  const wanted: { key: string; amount: number; reason: string }[] = [];
  for (const t of ts.docs) {
    const title = (t.data().title as string) ?? "a tournament";
    const td = t.data();
    const players = ((td.participantIds ?? []) as string[]).length;
    // No rewards for tournaments you run yourself, or for tiny ones (stops one person farming stars with spare accounts)
    if (td.organizerId === uid) continue;
    if (players >= 2) wanted.push({ key: `join_${t.id}`, amount: STAR_RULES.join, reason: `Joined ${title}` });
    if (td.winnerId === uid && players >= 4) wanted.push({ key: `win_${t.id}`, amount: STAR_RULES.win, reason: `Won ${title} 🏆` });
  }
  if (wanted.length) {
    const have = await db.getAll(...wanted.map((w) => db.doc(`stars/${uid}/log/${w.key}`)));
    for (let i = 0; i < wanted.length; i++) {
      if (!have[i].exists) await grant(db, uid, wanted[i].key, wanted[i].amount, wanted[i].reason);
    }
  }

  // 1v1 challenges both players confirmed: small reward, a few per day.
  const cs = await db.collection("challenges").where("participantIds", "array-contains", uid).limit(100).get();
  const stars = db.doc(`stars/${uid}`);
  for (const c of cs.docs) {
    const d = c.data();
    if (d.status !== "done" || d.winnerId !== uid) continue;
    await db.runTransaction(async (tx) => {
      const log = db.doc(`stars/${uid}/log/chal_${c.id}`);
      const [s, l] = await Promise.all([tx.get(stars), tx.get(log)]);
      if (l.exists) return;
      const sd = s.data() ?? {};
      const count = sd.chalDay === today() ? sd.chalCount ?? 0 : 0;
      if (count >= STAR_RULES.challengeWinsPerDay) return;
      tx.set(log, { amount: STAR_RULES.challengeWin, reason: "Won a 1v1 challenge", createdAt: FieldValue.serverTimestamp() });
      tx.set(
        stars,
        { balance: FieldValue.increment(STAR_RULES.challengeWin), lifetime: FieldValue.increment(STAR_RULES.challengeWin), chalDay: today(), chalCount: count + 1 },
        { merge: true }
      );
    });
  }
}

/* ---------- Streak Shield + weekly missions ---------- */

async function buyShield(db: Firestore, uid: string) {
  const sRef = db.doc(`stars/${uid}`);
  return db.runTransaction(async (tx) => {
    const s = (await tx.get(sRef)).data() ?? {};
    if (Number(s.shields ?? 0) >= STAR_RULES.maxShields) return { ok: false, error: `You can hold up to ${STAR_RULES.maxShields} shields.` };
    if ((s.balance ?? 0) < STAR_RULES.shieldPrice) return { ok: false, error: `You need ${STAR_RULES.shieldPrice} PlayCoins.` };
    tx.set(sRef, { balance: FieldValue.increment(-STAR_RULES.shieldPrice), shields: FieldValue.increment(1) }, { merge: true });
    tx.set(db.doc(`stars/${uid}/log/shield_${Date.now()}`), { amount: -STAR_RULES.shieldPrice, reason: "Bought a Streak Shield 🛡️", createdAt: FieldValue.serverTimestamp() });
    return { ok: true };
  });
}

/** Monday 00:00 UTC of the current week. */
function weekStartMs() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return d.getTime() - dow * 86400000;
}

async function missionProgress(db: Firestore, uid: string): Promise<{ weekId: string; items: MissionProgress[] }> {
  const ws = weekStartMs();
  const we = ws + 7 * 86400000;
  const weekId = new Date(ws).toISOString().slice(0, 10);

  const ts = await db.collection("tournaments").where("participantIds", "array-contains", uid).limit(300).get();
  const play = ts.docs.filter((t) => {
    const d = t.data();
    const at = d.startsAt?.toMillis?.() ?? 0;
    return d.organizerId !== uid && at >= ws && at < we && ((d.participantIds ?? []) as string[]).length >= 2;
  }).length;

  const cs = await db.collection("challenges").where("participantIds", "array-contains", uid).limit(100).get();
  const chal = cs.docs.filter((c) => {
    const d = c.data();
    return d.status === "done" && d.winnerId === uid && (d.updatedAt?.toMillis?.() ?? 0) >= ws;
  }).length;

  const keys: string[] = [];
  for (let t = ws; t < we && t <= Date.now(); t += 86400000) keys.push(`daily_${new Date(t).toISOString().slice(0, 10)}`);
  const got = keys.length ? await db.getAll(...keys.map((k) => db.doc(`stars/${uid}/log/${k}`))) : [];
  const days = got.filter((g) => g.exists).length;

  const value: Record<string, number> = { play, chal, days };
  return {
    weekId,
    items: MISSIONS.map((m) => ({ id: m.id, title: m.title, goal: m.goal, reward: m.reward, progress: Math.min(value[m.id] ?? 0, m.goal), done: (value[m.id] ?? 0) >= m.goal })),
  };
}

async function payMissions(db: Firestore, uid: string) {
  const { weekId, items } = await missionProgress(db, uid);
  for (const m of items) if (m.done) await grant(db, uid, `mission_${m.id}_${weekId}`, m.reward, `Weekly mission done: ${m.title}`);
  if (items.every((m) => m.done)) await grant(db, uid, `mission_all_${weekId}`, STAR_RULES.missionAllBonus, "All weekly missions done 🎯");
  return { weekId, items };
}

/* ---------- Shop: PlayCoins sales, held until the buyer confirms ---------- */

async function releaseOrder(db: Firestore, orderId: string) {
  const oRef = db.doc(`shopOrders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const o = (await tx.get(oRef)).data();
    if (!o || (o.status !== "held" && o.status !== "delivered")) return false;
    const itemSnap = await tx.get(db.doc(`shopItems/${o.itemId}`));
    const fee = Math.floor((o.price * STAR_RULES.shopFeePercent) / 100);
    const payout = o.price - fee;
    tx.set(db.doc(`stars/${o.sellerId}`), { balance: FieldValue.increment(payout), lifetime: FieldValue.increment(payout) }, { merge: true });
    tx.set(db.doc(`stars/${o.sellerId}/log/shopsale_${orderId}`), {
      amount: payout,
      reason: `Sold: ${o.itemTitle}${fee ? ` (after ${fee} fee)` : ""}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(oRef, { status: "released" });
    // the listing may have been removed meanwhile (e.g. by an admin) — the money must still move
    if (itemSnap.exists) tx.update(itemSnap.ref, { sold: true, reservedBy: null });
    return true;
  });
}

async function cancelOrder(db: Firestore, orderId: string, uid: string) {
  const oRef = db.doc(`shopOrders/${orderId}`);
  return db.runTransaction(async (tx) => {
    const o = (await tx.get(oRef)).data();
    if (!o) return { ok: false, error: "Order not found." };
    const itemSnap = await tx.get(db.doc(`shopItems/${o.itemId}`));
    const isSeller = o.sellerId === uid;
    const isBuyer = o.buyerId === uid;
    if (!isSeller && !isBuyer) return { ok: false, error: "That's not your order." };
    if (o.status !== "held" && !(o.status === "delivered" && isSeller)) return { ok: false, error: "This order can't be cancelled any more." };
    tx.set(db.doc(`stars/${o.buyerId}`), { balance: FieldValue.increment(o.price) }, { merge: true });
    tx.set(db.doc(`stars/${o.buyerId}/log/shoprefund_${orderId}`), {
      amount: o.price,
      reason: `Refund: ${o.itemTitle}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(oRef, { status: "cancelled" });
    if (itemSnap.exists) tx.update(itemSnap.ref, { reservedBy: null });
    return { ok: true };
  });
}

async function shopBuy(db: Firestore, uid: string, itemId: string) {
  const iRef = db.doc(`shopItems/${itemId}`);
  const buyer = (await db.doc(`users/${uid}`).get()).data();
  if (!buyer) return { ok: false, error: "Account not found." };
  return db.runTransaction(async (tx) => {
    const [i, s] = await Promise.all([tx.get(iRef), tx.get(db.doc(`stars/${uid}`))]);
    const it = i.data();
    if (!it) return { ok: false, error: "That item is gone." };
    const price = Number(it.starsPrice ?? 0);
    if (!(price >= 1)) return { ok: false, error: "This item isn't sold for PlayCoins." };
    if (it.sold) return { ok: false, error: "This item is already sold." };
    if (it.reservedBy) return { ok: false, error: "Someone else has already paid for this." };
    if (it.sellerId === uid) return { ok: false, error: "You can't buy your own item." };
    if ((s.data()?.balance ?? 0) < price) return { ok: false, error: `You need ${price} PlayCoins.` };
    const oRef = db.collection("shopOrders").doc();
    tx.set(db.doc(`stars/${uid}`), { balance: FieldValue.increment(-price) }, { merge: true });
    tx.set(db.doc(`stars/${uid}/log/shopbuy_${oRef.id}`), { amount: -price, reason: `Bought: ${it.title}`, createdAt: FieldValue.serverTimestamp() });
    tx.set(oRef, {
      itemId,
      itemTitle: it.title ?? "Item",
      itemImage: it.imageUrls?.[0] ?? null,
      buyerId: uid,
      buyer: { uid, username: buyer.username, displayName: buyer.displayName, photoURL: buyer.photoURL ?? null },
      sellerId: it.sellerId,
      seller: it.seller,
      participantIds: [uid, it.sellerId],
      price,
      status: "held",
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(iRef, { reservedBy: uid });
    return { ok: true };
  });
}

/** Releases PlayCoins to sellers when the buyer never confirmed, a few days after delivery. */
async function autoRelease(db: Firestore, uid: string) {
  const mine = await db.collection("shopOrders").where("participantIds", "array-contains", uid).limit(50).get();
  const cutoff = Date.now() - STAR_RULES.shopAutoReleaseDays * 86400000;
  for (const o of mine.docs) {
    const d = o.data();
    const at = d.deliveredAt?.toMillis?.();
    if (d.status === "delivered" && at && at < cutoff) await releaseOrder(db, o.id);
  }
}

/** Referrals: a welcome bonus for the referred player, and a reward for the referrer once the friend joins a tournament. */
/** If I was referred and have played a tournament, pay the person who referred me right away (once, within their limit). */
async function payMyReferrer(db: Firestore, uid: string) {
  const me = (await db.doc(`users/${uid}`).get()).data();
  const ref = me?.referredBy as string | undefined;
  if (!me?.onboardingComplete || !ref || ref === uid) return;
  const played = await db.collection("tournaments").where("participantIds", "array-contains", uid).limit(1).get();
  if (played.empty) return;
  const theirs = await db.collection("users").where("referredBy", "==", ref).limit(STAR_RULES.maxReferrals).get();
  if (!theirs.docs.some((d) => d.id === uid)) return;
  await grant(db, ref, `ref_${uid}`, STAR_RULES.referrer, `${me.displayName || me.username || "A friend"} joined through you`);
}

async function syncReferrals(db: Firestore, uid: string) {
  const me = (await db.doc(`users/${uid}`).get()).data();
  if (me?.onboardingComplete && me.referredBy && me.referredBy !== uid) {
    await grant(db, uid, "referee_bonus", STAR_RULES.referee, "Welcome bonus: you joined through a friend");
  }
  await payMyReferrer(db, uid);
  const friends = await db.collection("users").where("referredBy", "==", uid).limit(STAR_RULES.maxReferrals).get();
  for (const f of friends.docs) {
    if (f.id === uid || !f.data().onboardingComplete) continue;
    const played = await db.collection("tournaments").where("participantIds", "array-contains", f.id).limit(1).get();
    if (played.empty) continue;
    await grant(db, uid, `ref_${f.id}`, STAR_RULES.referrer, `${f.data().displayName || f.data().username || "A friend"} joined through you`);
  }
}

async function redeem(db: Firestore, uid: string, itemId: string) {
  const item = itemById(itemId);
  if (!item) return { ok: false, error: "That item doesn't exist." };
  const stars = db.doc(`stars/${uid}`);
  if (item.winnersOnly) {
    // checked against the tournaments themselves, not the profile counter (players can edit that)
    const won = await db.collection("tournaments").where("winnerId", "==", uid).limit(1).get();
    if (won.empty) return { ok: false, error: "Only tournament winners can get this one." };
  }
  return db.runTransaction(async (tx) => {
    const s = (await tx.get(stars)).data() ?? {};
    if ((s.owned ?? []).includes(item.id)) return { ok: false, error: "You already own this." };
    if ((s.balance ?? 0) < item.price) return { ok: false, error: "Not enough PlayCoins yet." };
    tx.set(db.doc(`stars/${uid}/log/buy_${item.id}`), { amount: -item.price, reason: `Redeemed ${item.name}`, createdAt: FieldValue.serverTimestamp() });
    tx.set(stars, { balance: FieldValue.increment(-item.price), owned: FieldValue.arrayUnion(item.id) }, { merge: true });
    return { ok: true };
  });
}

async function equip(db: Firestore, uid: string, slot: string, itemId: string | null) {
  if (!STAR_SLOTS.includes(slot as StarSlot)) return { ok: false, error: "Bad slot." };
  const stars = db.doc(`stars/${uid}`);
  if (itemId) {
    const item = itemById(itemId);
    const s = (await stars.get()).data() ?? {};
    if (!item || item.slot !== slot || !(s.owned ?? []).includes(itemId)) return { ok: false, error: "You don't own that." };
  }
  await stars.set({ equipped: { [slot]: itemId } }, { merge: true });
  return { ok: true };
}

/** Pay the PlayCoins entry fee and join, all in one step the player can't skip. */
async function joinTournament(db: Firestore, uid: string, tournamentId: string) {
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const sRef = db.doc(`stars/${uid}`);
  return db.runTransaction(async (tx) => {
    const [t, s, started] = await Promise.all([tx.get(tRef), tx.get(sRef), tx.get(tRef.collection("matches").limit(1))]);
    const td = t.data();
    if (!td || td.entryType !== "stars") return { ok: false, error: "This tournament doesn't use PlayCoins." };
    if (td.status === "completed") return { ok: false, error: "This tournament is over." };
    if (!started.empty) return { ok: false, error: "The bracket has already started." };
    if (td.organizerId === uid) return { ok: false, error: "You're the organiser." };
    const people: string[] = td.participantIds ?? [];
    if (people.includes(uid)) return { ok: false, error: "You've already joined." };
    if (people.length >= (td.maxParticipants ?? 0)) return { ok: false, error: "This tournament is full." };
    const fee = Number(td.starsFee ?? 0);
    if (!(fee >= 1)) return { ok: false, error: "This tournament has no entry price set." };
    if ((s.data()?.balance ?? 0) < fee) return { ok: false, error: `You need ${fee} PlayCoins to join.` };
    tx.update(tRef, { participantIds: FieldValue.arrayUnion(uid), waitlistIds: FieldValue.arrayRemove(uid) });
    tx.set(sRef, { balance: FieldValue.increment(-fee) }, { merge: true });
    // The fee is held for the organiser (server-only record) and paid out when the bracket starts.
    tx.set(db.doc(`tournamentPots/${tournamentId}`), { organizerId: td.organizerId, pot: FieldValue.increment(fee), payers: FieldValue.arrayUnion(uid) }, { merge: true });
    // remember exactly what was paid, so a refund can never be bigger (or smaller) if the organiser later changes the price
    tx.set(sRef.collection("paid").doc(tournamentId), { amount: fee, at: FieldValue.serverTimestamp() });
    tx.set(db.doc(`stars/${uid}/log/entry_${tournamentId}_${Date.now()}`), {
      amount: -fee,
      reason: `Entry: ${td.title ?? "tournament"}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

/** Leave before the bracket starts and get the entry fee back. */
async function leaveTournament(db: Firestore, uid: string, tournamentId: string) {
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const sRef = db.doc(`stars/${uid}`);
  return db.runTransaction(async (tx) => {
    const paidRef = sRef.collection("paid").doc(tournamentId);
    const potRef = db.doc(`tournamentPots/${tournamentId}`);
    const [t, started, paid, potSnap] = await Promise.all([tx.get(tRef), tx.get(tRef.collection("matches").limit(1)), tx.get(paidRef), tx.get(potRef)]);
    const td = t.data();
    // judged by what this player actually paid, so an organiser changing the entry type later can't trap their fee
    if (!td || (td.entryType !== "stars" && !paid.exists)) return { ok: false, error: "This tournament doesn't use PlayCoins." };
    if (!((td.participantIds ?? []) as string[]).includes(uid)) return { ok: false, error: "You haven't joined." };
    if (!started.empty || td.status !== "upcoming") return { ok: false, error: "It's too late to leave and get your PlayCoins back." };
    // refund what this player actually paid (older joins without a record fall back to the current price)
    const fee = paid.exists ? Number(paid.data()?.amount ?? 0) : Number(td.starsFee ?? 0);
    tx.update(tRef, { participantIds: FieldValue.arrayRemove(uid) });
    if (paid.exists) tx.delete(paidRef);
    if (fee >= 1) {
      // take it back out of the held pot (older joins from before pots existed have nothing to take from)
      if (Number(potSnap.data()?.pot ?? 0) >= fee) tx.update(potRef, { pot: FieldValue.increment(-fee), payers: FieldValue.arrayRemove(uid) });
      tx.set(sRef, { balance: FieldValue.increment(fee) }, { merge: true });
      tx.set(db.doc(`stars/${uid}/log/refund_${tournamentId}_${Date.now()}`), {
        amount: fee,
        reason: `Refund: ${td.title ?? "tournament"}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return { ok: true };
  });
}

/* ---------- paid actions: creating a tournament, selling, and the 200 🪙 unlocks ---------- */

/** Only photos/videos that were uploaded through the app's own storage. */
function okMediaUrl(u: unknown): u is string {
  if (typeof u !== "string" || u.length > 600 || !u.startsWith("https://")) return false;
  const r2 = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  return u.startsWith("https://res.cloudinary.com/") || u.startsWith("https://firebasestorage.googleapis.com/") || (!!r2 && u.startsWith(r2 + "/"));
}
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function createTournament(db: Firestore, uid: string, d: Record<string, unknown>) {
  const u = (await db.doc(`users/${uid}`).get()).data();
  if (u?.accountType !== "organizer") return { ok: false, error: "Only organiser accounts can create tournaments." };
  const title = str(d.title, 100);
  const game = str(d.game, 60);
  const format = String(d.format ?? "");
  const entryType = String(d.entryType ?? "free");
  const max = Math.floor(Number(d.maxParticipants));
  const startsMs = Number(d.startsAt);
  if (!title || !game) return { ok: false, error: "Add a title and a game." };
  if (!["single_elimination", "double_elimination", "round_robin"].includes(format)) return { ok: false, error: "Pick a format." };
  if (!["free", "paid", "stars"].includes(entryType)) return { ok: false, error: "Bad entry type." };
  if (!(max >= 2 && max <= 512)) return { ok: false, error: "Players must be between 2 and 512." };
  if (!Number.isFinite(startsMs) || startsMs <= 0) return { ok: false, error: "Pick a start time." };
  const starsFee = entryType === "stars" ? Math.min(10000, Math.max(1, Math.round(Number(d.starsFee)))) : null;
  if (entryType === "stars" && !(starsFee && starsFee >= 1)) return { ok: false, error: "Set the PlayCoins entry price." };
  const entryFeeText = entryType === "paid" ? str(d.entryFee, 60) : null;
  if (entryType === "paid" && !entryFeeText) return { ok: false, error: "Set the entry fee." };
  const fee = STAR_RULES.createTournamentFee;
  const sRef = db.doc(`stars/${uid}`);
  const ref = db.collection("tournaments").doc();
  return db.runTransaction(async (tx) => {
    const s = (await tx.get(sRef)).data() ?? {};
    if ((s.balance ?? 0) < fee) return { ok: false, error: `Creating a tournament costs ${fee} PlayCoins. You have ${s.balance ?? 0}.` };
    tx.set(sRef, { balance: FieldValue.increment(-fee) }, { merge: true });
    tx.set(db.doc(`stars/${uid}/log/create_${ref.id}`), { amount: -fee, reason: `Created tournament: ${title}`, createdAt: FieldValue.serverTimestamp() });
    tx.set(ref, {
      title,
      game,
      description: str(d.description, 2000),
      organizerId: uid,
      format,
      maxParticipants: max,
      entryType,
      entryFee: entryType === "paid" ? entryFeeText : entryType === "stars" ? `${starsFee} PlayCoins` : null,
      starsFee,
      prize: str(d.prize, 200) || null,
      participantIds: [],
      pendingParticipantIds: [],
      status: "upcoming",
      startsAt: new Date(startsMs),
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.doc(`users/${uid}`), { tournamentsOrganized: FieldValue.increment(1) });
    return { ok: true, id: ref.id };
  });
}

async function shopCreate(db: Firestore, uid: string, d: Record<string, unknown>) {
  const u = (await db.doc(`users/${uid}`).get()).data();
  if (!u) return { ok: false, error: "Couldn't find your profile." };
  const title = str(d.title, 80);
  const price = Number(d.price);
  const images = Array.isArray(d.imageUrls) ? (d.imageUrls as unknown[]) : [];
  const category = String(d.category ?? "other");
  if (title.length < 3) return { ok: false, error: "Add a title." };
  if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return { ok: false, error: "Enter a price." };
  if (images.length < 1 || images.length > 10 || !images.every(okMediaUrl)) return { ok: false, error: "Add at least one photo." };
  if (d.videoUrl && !okMediaUrl(d.videoUrl)) return { ok: false, error: "That video link isn't allowed." };
  if (!["accounts", "coins", "consoles", "controllers", "accessories", "other"].includes(category)) return { ok: false, error: "Pick a category." };
  const sp = Math.round(Number(d.starsPrice));
  const starsPrice = Number.isFinite(sp) && sp >= 1 ? Math.min(100000, sp) : null;
  const fee = STAR_RULES.sellFee;
  const sRef = db.doc(`stars/${uid}`);
  const ref = db.collection("shopItems").doc();
  return db.runTransaction(async (tx) => {
    const s = (await tx.get(sRef)).data() ?? {};
    if ((s.balance ?? 0) < fee) return { ok: false, error: `Posting something for sale costs ${fee} PlayCoins. You have ${s.balance ?? 0}.` };
    tx.set(sRef, { balance: FieldValue.increment(-fee) }, { merge: true });
    tx.set(db.doc(`stars/${uid}/log/sell_${ref.id}`), { amount: -fee, reason: `Listed for sale: ${title}`, createdAt: FieldValue.serverTimestamp() });
    tx.set(ref, {
      sellerId: uid,
      seller: { uid, username: u.username ?? "", displayName: u.displayName ?? "", photoURL: u.photoURL ?? null },
      title,
      description: str(d.description, 1000),
      price,
      currency: "GH₵",
      starsPrice,
      reservedBy: null,
      category,
      location: str(d.location, 60),
      imageUrls: images,
      ...(d.videoUrl ? { videoUrl: d.videoUrl } : {}),
      sold: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  });
}

async function owns(db: Firestore, uid: string, itemId: string) {
  return (((await db.doc(`stars/${uid}`).get()).data()?.owned ?? []) as string[]).includes(itemId);
}

async function setChatStyle(db: Firestore, uid: string, bubble: unknown, wallpaper: unknown) {
  if (!(await owns(db, uid, "unlock_chat"))) return { ok: false, error: "Unlock the Chat Customiser first." };
  const b = bubble == null || bubble === "" ? null : String(bubble);
  const w = wallpaper == null || wallpaper === "" ? null : String(wallpaper);
  if ((b && !CHAT_BUBBLES[b]) || (w && !CHAT_WALLPAPERS[w])) return { ok: false, error: "That style doesn't exist." };
  await db.doc(`stars/${uid}`).set({ chat: { bubble: b, wallpaper: w } }, { merge: true });
  return { ok: true };
}

async function setProfileBg(db: Firestore, uid: string, type: unknown, value: unknown) {
  if (!(await owns(db, uid, "unlock_profilebg"))) return { ok: false, error: "Unlock the Profile Background first." };
  const ref = db.doc(`stars/${uid}`);
  if (type === "none") {
    await ref.set({ profileBg: FieldValue.delete() }, { merge: true });
    return { ok: true };
  }
  if (type === "preset" && typeof value === "string" && PROFILE_BGS[value]) {
    await ref.set({ profileBg: { type: "preset", value } }, { merge: true });
    return { ok: true };
  }
  if (type === "image" && okMediaUrl(value) && value.includes(`/${uid}/`)) {
    await ref.set({ profileBg: { type: "image", value } }, { merge: true });
    return { ok: true };
  }
  return { ok: false, error: "That background isn't allowed." };
}

/* ---------- sending PlayCoins to another player ---------- */

async function sendEligibility(db: Firestore, uid: string) {
  const [ts, ps, st] = await Promise.all([
    db.collection("tournaments").where("participantIds", "array-contains", uid).limit(30).get(),
    db.collection("posts").where("authorId", "==", uid).limit(STAR_RULES.sendMinPosts).get(),
    db.doc(`stars/${uid}`).get(),
  ]);
  // joined as a player, not just running one
  const joined = ts.docs.filter((d) => d.data().organizerId !== uid).length;
  const sd = st.data() ?? {};
  const sentToday = sd.sentDay === today() ? Number(sd.sentToday ?? 0) : 0;
  return {
    joined,
    posts: ps.size,
    sentToday,
    eligible: joined >= STAR_RULES.sendMinTournaments && ps.size >= STAR_RULES.sendMinPosts,
  };
}

async function sendCoins(db: Firestore, uid: string, toRaw: string, amountRaw: number) {
  const amount = Math.floor(Number(amountRaw));
  if (!(amount >= 1)) return { ok: false, error: "Enter how many PlayCoins to send." };
  if (amount > STAR_RULES.sendMax) return { ok: false, error: `You can send up to ${STAR_RULES.sendMax} 🪙 at a time.` };
  const el = await sendEligibility(db, uid);
  if (el.joined < STAR_RULES.sendMinTournaments) return { ok: false, error: "Join a tournament first to unlock sending PlayCoins." };
  if (el.posts < STAR_RULES.sendMinPosts) return { ok: false, error: `Post at least ${STAR_RULES.sendMinPosts} times to unlock sending PlayCoins (you have ${el.posts}).` };
  const name = String(toRaw ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!name) return { ok: false, error: "Enter the player's username." };
  const found = await db.collection("users").where("username", "==", name).limit(1).get();
  const to = found.docs[0];
  if (!to || to.data().onboardingComplete !== true) return { ok: false, error: "Couldn't find a player with that username." };
  if (to.id === uid) return { ok: false, error: "You can't send PlayCoins to yourself." };
  // The receiver has to qualify the same way the sender does.
  const rel = await sendEligibility(db, to.id);
  if (!rel.eligible) {
    return { ok: false, error: `@${to.data().username} can't receive PlayCoins yet. They need to join a tournament and make at least ${STAR_RULES.sendMinPosts} posts first.` };
  }
  const me = (await db.doc(`users/${uid}`).get()).data() ?? {};
  const sRef = db.doc(`stars/${uid}`);
  const r = await db.runTransaction(async (tx) => {
    const s = (await tx.get(sRef)).data() ?? {};
    const sentToday = s.sentDay === today() ? Number(s.sentToday ?? 0) : 0;
    if ((s.balance ?? 0) < amount) return { ok: false, error: `You only have ${s.balance ?? 0} PlayCoins.` };
    if (sentToday + amount > STAR_RULES.sendDailyLimit) {
      const left = Math.max(0, STAR_RULES.sendDailyLimit - sentToday);
      return { ok: false, error: `Daily sending limit reached. You can send ${left} more 🪙 today.` };
    }
    const stamp = Date.now();
    tx.set(sRef, { balance: FieldValue.increment(-amount), sentDay: today(), sentToday: sentToday + amount }, { merge: true });
    // received coins add to the balance but not to "lifetime earned", so they can't be recycled into rank
    tx.set(db.doc(`stars/${to.id}`), { balance: FieldValue.increment(amount) }, { merge: true });
    tx.set(db.doc(`stars/${uid}/log/sent_${stamp}`), {
      amount: -amount,
      reason: `Sent to @${to.data().username}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.doc(`stars/${to.id}/log/recv_${uid}_${stamp}`), {
      amount,
      reason: `Received from @${me.username ?? "a player"}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection(`notifications/${to.id}/items`).doc(), {
      type: "coins",
      amount,
      fromUid: uid,
      fromUser: { uid, username: me.username ?? "", displayName: me.displayName ?? "A player", photoURL: me.photoURL ?? null },
      link: "/stars",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, sent: amount, to: to.data().username as string };
  });
  return r;
}

/**
 * Pays an organiser the entry fees held for their PlayCoins tournaments once the
 * bracket has started (so nobody can be refunded after the organiser has been paid).
 */
async function releaseTournamentFees(db: Firestore, uid: string) {
  const pots = await db.collection("tournamentPots").where("organizerId", "==", uid).limit(100).get();
  for (const p of pots.docs) {
    if (Number(p.data().pot ?? 0) < 1) continue;
    const tRef = db.doc(`tournaments/${p.id}`);
    await db.runTransaction(async (tx) => {
      const [pot, t, started] = await Promise.all([tx.get(p.ref), tx.get(tRef), tx.get(tRef.collection("matches").limit(1))]);
      const amount = Math.floor(Number(pot.data()?.pot ?? 0));
      const td = t.data();
      if (amount < 1 || !td || td.organizerId !== uid || started.empty) return;
      const cut = Math.floor((amount * STAR_RULES.tournamentFeePercent) / 100);
      const pay = amount - cut;
      tx.update(p.ref, { pot: 0, paidOut: FieldValue.increment(amount) });
      tx.set(db.doc(`stars/${uid}`), { balance: FieldValue.increment(pay), lifetime: FieldValue.increment(pay) }, { merge: true });
      tx.set(db.doc(`stars/${uid}/log/tpayout_${p.id}_${Date.now()}`), {
        amount: pay,
        reason: `Entry fees: ${td.title ?? "your tournament"}${cut ? ` (after ${cut} fee)` : ""}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
}

/** Before a tournament is deleted: give every player their entry fee back (only possible before the bracket starts). */
async function refundTournament(db: Firestore, uid: string, tournamentId: string) {
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const t = (await tRef.get()).data();
  if (!t) return { ok: true };
  const me = (await db.doc(`users/${uid}`).get()).data();
  if (t.organizerId !== uid && me?.isAdmin !== true) return { ok: false, error: "Only the organiser can do that." };
  const potRef = db.doc(`tournamentPots/${tournamentId}`);
  // everyone who paid (even if the organiser later removed them from the player list or changed the entry type)
  const payers = new Set<string>([...(((await potRef.get()).data()?.payers ?? []) as string[]), ...(((t.participantIds ?? []) as string[]))]);
  for (const pid of Array.from(payers)) {
    await db.runTransaction(async (tx) => {
      const paidRef = db.doc(`stars/${pid}/paid/${tournamentId}`);
      const [paid, pot, started] = await Promise.all([tx.get(paidRef), tx.get(potRef), tx.get(tRef.collection("matches").limit(1))]);
      if (!paid.exists || !started.empty) return; // already refunded, or the organiser has already been paid
      const fee = Number(paid.data()?.amount ?? 0);
      tx.delete(paidRef);
      if (fee < 1) return;
      if (Number(pot.data()?.pot ?? 0) >= fee) tx.update(potRef, { pot: FieldValue.increment(-fee) });
      tx.set(db.doc(`stars/${pid}`), { balance: FieldValue.increment(fee) }, { merge: true });
      tx.set(db.doc(`stars/${pid}/log/refund_${tournamentId}_${Date.now()}`), {
        amount: fee,
        reason: `Refund: ${t.title ?? "tournament"} was cancelled`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
  return { ok: true };
}

export async function POST(req: Request) {
  if (!initAdmin()) return NextResponse.json({ ok: false, error: "PlayCoins aren't set up on the server yet." }, { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  }
  let body: { action?: string; itemId?: string | null; slot?: string; tournamentId?: string; orderId?: string; to?: string; amount?: number; data?: Record<string, unknown>; bubble?: string | null; wallpaper?: string | null; bgType?: string; bgValue?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const db = getFirestore();
  try {
    if (body.action === "sync") {
      await claimDaily(db, uid);
      await syncEarnings(db, uid);
      await syncReferrals(db, uid);
      await payMissions(db, uid).catch(() => undefined);
      await autoRelease(db, uid);
      await releaseTournamentFees(db, uid).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "missions") {
      const { items } = await payMissions(db, uid);
      return NextResponse.json({ ok: true, missions: items, weekEnds: weekStartMs() + 7 * 86400000 });
    }
    if (body.action === "sendInfo") {
      const el = await sendEligibility(db, uid);
      return NextResponse.json({ ok: true, ...el, minPosts: STAR_RULES.sendMinPosts, minTournaments: STAR_RULES.sendMinTournaments, dailyLimit: STAR_RULES.sendDailyLimit, maxEach: STAR_RULES.sendMax });
    }
    if (body.action === "createTournament") return NextResponse.json(await createTournament(db, uid, body.data ?? {}));
    if (body.action === "shopCreate") return NextResponse.json(await shopCreate(db, uid, body.data ?? {}));
    if (body.action === "setChatStyle") return NextResponse.json(await setChatStyle(db, uid, body.bubble, body.wallpaper));
    if (body.action === "setProfileBg") return NextResponse.json(await setProfileBg(db, uid, body.bgType, body.bgValue));
    if (body.action === "send") return NextResponse.json(await sendCoins(db, uid, String(body.to ?? ""), Number(body.amount)));
    if (body.action === "buyShield") return NextResponse.json(await buyShield(db, uid));
    if (body.action === "joinTournament" && body.tournamentId) {
      const r = await joinTournament(db, uid, body.tournamentId);
      if (r.ok) await payMyReferrer(db, uid).catch(() => undefined);
      return NextResponse.json(r);
    }
    if (body.action === "leaveTournament" && body.tournamentId) return NextResponse.json(await leaveTournament(db, uid, body.tournamentId));
    if (body.action === "cancelTournament" && body.tournamentId) return NextResponse.json(await refundTournament(db, uid, body.tournamentId));
    if (body.action === "shopBuy" && body.itemId) return NextResponse.json(await shopBuy(db, uid, body.itemId));
    if (body.action === "shopCancel" && body.orderId) return NextResponse.json(await cancelOrder(db, body.orderId, uid));
    if (body.action === "shopDeliver" && body.orderId) {
      const oRef = db.doc(`shopOrders/${body.orderId}`);
      const o = (await oRef.get()).data();
      if (!o || o.sellerId !== uid || o.status !== "held") return NextResponse.json({ ok: false, error: "You can't mark that as delivered." });
      await oRef.update({ status: "delivered", deliveredAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "shopConfirm" && body.orderId) {
      const o = (await db.doc(`shopOrders/${body.orderId}`).get()).data();
      if (!o || o.buyerId !== uid) return NextResponse.json({ ok: false, error: "That's not your order." });
      const done = await releaseOrder(db, body.orderId);
      return NextResponse.json(done ? { ok: true } : { ok: false, error: "This order is already finished." });
    }
    if (body.action === "redeem" && body.itemId) return NextResponse.json(await redeem(db, uid, body.itemId));
    if (body.action === "equip" && body.slot) return NextResponse.json(await equip(db, uid, body.slot, body.itemId ?? null));
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const e = err as { code?: unknown; message?: string };
    console.error("[stars] failed:", e?.code, e?.message);
    const code = e?.code ? ` (${String(e.code).slice(0, 40)})` : "";
    return NextResponse.json({ ok: false, error: `Something went wrong${code}. Try again.` }, { status: 500 });
  }
}
