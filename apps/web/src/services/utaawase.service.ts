/**
 * 102: 歌合・節気別歌位確定 - Frontend data service
 */
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { SeasonSnapshot, UserProgress } from '@/types/utaawase';

/**
 * publish済みスナップショットを取得
 */
export async function getPublishedSnapshot(seasonKey: string): Promise<SeasonSnapshot | null> {
  const ref = doc(db, 'season_snapshots', seasonKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as SeasonSnapshot;
  if (data.pipeline.status !== 'published') return null;
  return data;
}

/**
 * 最新のpublish済みスナップショットを取得
 */
export async function getLatestPublishedSnapshot(): Promise<SeasonSnapshot | null> {
  const q = query(
    collection(db, 'season_snapshots'),
    where('pipeline.status', '==', 'published'),
    orderBy('pipeline.publishedAt', 'desc')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as SeasonSnapshot;
}

/**
 * ユーザー進捗を取得
 */
export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  const ref = doc(db, 'user_progress', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProgress;
}

/**
 * 現在シーズンの累積スコアランキングを取得
 * (draft/frozen status のスナップショットから)
 */
export async function getCurrentSeasonSnapshot(seasonKey: string): Promise<SeasonSnapshot | null> {
  const ref = doc(db, 'season_snapshots', seasonKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as SeasonSnapshot;
}

/**
 * 歌位保持者一覧を取得
 * (user_progressコレクションから歌位を持つユーザーを取得)
 */
export async function getUtakuraiHolders(): Promise<UserProgress[]> {
  // 歌位（名歌位・永世名歌位）を持つユーザー
  const utakuraiQuery = query(
    collection(db, 'user_progress'),
    where('utakuraiLevel', '!=', null)
  );
  const utakuraiSnap = await getDocs(utakuraiQuery);
  return utakuraiSnap.docs.map(doc => doc.data() as UserProgress);
}

/**
 * 段位保持者一覧を取得
 */
export async function getDanHolders(): Promise<UserProgress[]> {
  const danQuery = query(
    collection(db, 'user_progress'),
    where('danLevel', '!=', null)
  );
  const danSnap = await getDocs(danQuery);
  return danSnap.docs.map(doc => doc.data() as UserProgress);
}

/**
 * 伝位保持者一覧を取得
 */
export async function getDenHolders(): Promise<UserProgress[]> {
  const denQuery = query(
    collection(db, 'user_progress'),
    where('denLevel', '!=', null)
  );
  const denSnap = await getDocs(denQuery);
  return denSnap.docs.map(doc => doc.data() as UserProgress);
}

/**
 * ユーザーの競技セッション履歴を取得
 */
export interface UserSession {
  sessionId: string;
  status: string;
  score?: number;
  correctCount?: number;
  totalElapsedMs?: number;
  startedAt: Date;
  submittedAt?: Date;
  confirmedAt?: Date;
  dayKeyJst?: string;
  seasonId: string;
}

export async function getUserSessions(uid: string, limitCount = 50): Promise<UserSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid),
    orderBy('startedAt', 'desc')
  );
  const snap = await getDocs(q);

  const sessions: UserSession[] = [];
  snap.docs.slice(0, limitCount).forEach(doc => {
    const data = doc.data();
    sessions.push({
      sessionId: doc.id,
      status: data.status,
      score: data.score,
      correctCount: data.correctCount,
      totalElapsedMs: data.totalElapsedMs,
      startedAt: data.startedAt?.toDate() || new Date(),
      submittedAt: data.submittedAt?.toDate(),
      confirmedAt: data.confirmedAt?.toDate(),
      dayKeyJst: data.dayKeyJst,
      seasonId: data.seasonId,
    });
  });

  return sessions;
}
