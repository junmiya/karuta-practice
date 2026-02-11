import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
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
 * Queries confirmed sessions from the sessions collection
 */
export async function getTodaysBanzuke(): Promise<Submission[]> {
  const dayKeyJst = getCurrentJstDate();

  // Query sessions collection for confirmed sessions today
  const sessionsRef = collection(db, 'sessions');
  const q = query(
    sessionsRef,
    where('status', '==', 'confirmed'),
    where('dayKeyJst', '==', dayKeyJst),
    orderBy('score', 'desc')
  );

  const snapshot = await getDocs(q);

  // Get user nicknames for display
  const results: Submission[] = [];

  for (const sessionDoc of snapshot.docs) {
    const data = sessionDoc.data();

    // Use nickname from session if available (new sessions save it),
    // otherwise fallback to fetching from users collection (for legacy data)
    let nickname = data.nickname || '';
    if (!nickname) {
      try {
        const userDocRef = doc(db, 'users', data.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          nickname = userDocSnap.data()?.nickname || 'Anonymous';
        }
      } catch {
        nickname = 'Anonymous';
      }
    }

    const avgMs = data.correctCount > 0
      ? Math.round(data.totalElapsedMs / 50)
      : 0;

    results.push({
      id: sessionDoc.id,
      uid: data.uid,
      nickname,
      dayKeyJst: data.dayKeyJst,
      questionCount: 50,
      correctCount: data.correctCount || 0,
      totalElapsedMs: data.totalElapsedMs || 0,
      avgMs,
      score: data.score || 0,
      official: true,
      invalidReasons: [],
      clientSubmittedAt: data.startedAt?.toDate() || new Date(),
      serverSubmittedAt: data.confirmedAt?.toDate() || new Date(),
    });
  }

  return results;
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
