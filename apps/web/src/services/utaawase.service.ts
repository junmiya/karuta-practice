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
