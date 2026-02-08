/**
 * 102: ユーザー進捗 Firestore CRUD
 * Collection: user_progress/{uid}
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  UserProgress,
  KyuiLevel,
  DanLevel,
  DenLevel,
  UtakuraiLevel,
  UTAAWASE_COLLECTIONS,
} from '../types/utaawase';

const db = admin.firestore();

/**
 * ユーザー進捗を取得（なければ初期値を作成）
 */
export async function getUserProgress(uid: string): Promise<UserProgress> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  const doc = await ref.get();

  if (doc.exists) {
    return doc.data() as UserProgress;
  }

  // Get nickname from users collection
  const userDoc = await db.collection('users').doc(uid).get();
  const nickname = userDoc.exists ? userDoc.data()?.nickname || 'Anonymous' : 'Anonymous';

  const initial: UserProgress = {
    uid,
    nickname,
    kyuiLevel: 'minarai',
    danLevel: null,
    danEligible: false,
    denLevel: null,
    denEligible: false,
    utakuraiLevel: null,
    seasonScores: {},
    officialWinCount: 0,
    championCount: 0,
    totalOfficialMatches: 0,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await ref.set(initial);
  return initial;
}

/**
 * 級位を更新（即時昇級）
 */
export async function updateKyuiLevel(
  uid: string,
  newLevel: KyuiLevel,
  danEligible: boolean
): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  const update: Record<string, any> = {
    kyuiLevel: newLevel,
    kyuiPromotedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (danEligible) {
    update.danEligible = true;
  }
  await ref.update(update);
}

/**
 * スコアを追加し、ベスト3合計を再計算（matchイベント後）
 */
export async function updateCumulativeScore(
  uid: string,
  seasonKey: string,
  score: number,
  isOfficial: boolean
): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) return;

    const data = doc.data() as UserProgress;
    const seasonData = data.seasonScores?.[seasonKey] || { scores: [], bestThreeTotal: 0 };
    const scores = [...(seasonData.scores || []), score];
    const bestThree = scores.sort((a, b) => b - a).slice(0, 3);
    const bestThreeTotal = bestThree.reduce((sum, s) => sum + s, 0);

    const update: Record<string, any> = {
      [`seasonScores.${seasonKey}`]: { scores, bestThreeTotal },
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isOfficial) {
      update.totalOfficialMatches = FieldValue.increment(1);
    }

    transaction.update(ref, update);
  });
}

/**
 * 段位を更新（季末確定時）
 */
export async function updateDanLevel(uid: string, newLevel: DanLevel): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  const update: Record<string, any> = {
    danLevel: newLevel,
    danPromotedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // 六段到達でden_eligible
  if (newLevel === 'rokudan') {
    update.denEligible = true;
  }
  await ref.update(update);
}

/**
 * 伝位を更新（季末確定時）
 */
export async function updateDenLevel(uid: string, newLevel: DenLevel): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  await ref.update({
    denLevel: newLevel,
    denPromotedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 歌位を更新（季末確定時）
 */
export async function updateUtakuraiLevel(uid: string, newLevel: UtakuraiLevel): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  await ref.update({
    utakuraiLevel: newLevel,
    utakuraiPromotedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 上位入賞回数を加算
 */
export async function incrementOfficialWinCount(uid: string): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  await ref.update({
    officialWinCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 優勝回数を加算
 */
export async function incrementChampionCount(uid: string): Promise<void> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
  await ref.update({
    championCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
