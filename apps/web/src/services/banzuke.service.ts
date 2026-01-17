import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Submission } from '@/types/submission';

/**
 * Get current JST date as YYYY-MM-DD string
 */
function getCurrentJstDate(): string {
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstTime.toISOString().split('T')[0];
}

/**
 * Get today's official rankings from Firestore
 * Sorted by score (desc), then serverSubmittedAt (asc) for tiebreaker
 */
export async function getTodaysBanzuke(): Promise<Submission[]> {
  const dayKeyJst = getCurrentJstDate();

  const submissionsRef = collection(db, 'submissions');
  const q = query(
    submissionsRef,
    where('dayKeyJst', '==', dayKeyJst),
    where('official', '==', true),
    orderBy('score', 'desc'),
    orderBy('serverSubmittedAt', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid,
      nickname: data.nickname,
      dayKeyJst: data.dayKeyJst,
      questionCount: data.questionCount,
      correctCount: data.correctCount,
      totalElapsedMs: data.totalElapsedMs,
      avgMs: data.avgMs,
      score: data.score,
      official: data.official,
      invalidReasons: data.invalidReasons || [],
      clientSubmittedAt: data.clientSubmittedAt?.toDate() || new Date(),
      serverSubmittedAt: data.serverSubmittedAt?.toDate() || new Date(),
    };
  });
}

/**
 * Get JST date string for display
 */
export function getJstDateForDisplay(): string {
  const now = new Date();
  const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstTime.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
