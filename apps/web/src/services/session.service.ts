/**
 * Session service for managing official competition sessions
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  // Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './firebase';
import type { Session, Round, SessionStatus } from '@/types/session';

const SESSIONS_COLLECTION = 'sessions';

/**
 * Create a new official session
 */
export async function createSession(
  uid: string,
  seasonId: string,
  entryId: string
): Promise<string> {
  const sessionRef = doc(collection(db, SESSIONS_COLLECTION));
  const sessionId = sessionRef.id;

  const session = {
    uid,
    seasonId,
    entryId,
    roundCount: 50,
    status: 'created' as SessionStatus,
    startedAt: serverTimestamp(),
  };

  await setDoc(sessionRef, session);
  return sessionId;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const sessionDoc = await getDoc(sessionRef);

  if (!sessionDoc.exists()) {
    return null;
  }

  const data = sessionDoc.data();
  return {
    uid: data.uid,
    seasonId: data.seasonId,
    entryId: data.entryId,
    roundCount: data.roundCount,
    status: data.status as SessionStatus,
    startedAt: data.startedAt?.toDate() || new Date(),
    submittedAt: data.submittedAt?.toDate(),
    confirmedAt: data.confirmedAt?.toDate(),
    score: data.score,
    correctCount: data.correctCount,
    totalElapsedMs: data.totalElapsedMs,
    invalidReasons: data.invalidReasons,
    dayKeyJst: data.dayKeyJst,
  };
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, { status });
}

/**
 * Save a round to the session
 */
export async function saveRound(
  sessionId: string,
  round: Round
): Promise<void> {
  const roundId = round.roundIndex.toString().padStart(2, '0');
  const roundRef = doc(
    db,
    SESSIONS_COLLECTION,
    sessionId,
    'rounds',
    roundId
  );

  await setDoc(roundRef, {
    roundIndex: round.roundIndex,
    correctPoemId: round.correctPoemId,
    choices: round.choices,
    selectedPoemId: round.selectedPoemId,
    isCorrect: round.isCorrect,
    clientElapsedMs: round.clientElapsedMs,
  });
}

/**
 * Submit session for confirmation
 */
export interface SubmitResponse {
  status: 'confirmed' | 'invalid' | 'expired' | 'error';
  score?: number;
  reasons?: string[];
  message?: string;
}

export async function submitSession(
  sessionId: string
): Promise<SubmitResponse> {
  console.log('[submitSession] Starting submission for session:', sessionId);

  // Verify user is authenticated before calling Cloud Function
  const currentUser = auth.currentUser;
  console.log('[submitSession] Current user:', currentUser?.uid || 'null');

  if (!currentUser) {
    throw new Error('認証が必要です。再ログインしてください。');
  }

  // Force token refresh to ensure we have a valid token
  try {
    const token = await currentUser.getIdToken(true);
    console.log('[submitSession] Token refreshed, length:', token.length);
  } catch (tokenError) {
    console.error('[submitSession] Token refresh failed:', tokenError);
    throw new Error('認証トークンの更新に失敗しました。再ログインしてください。');
  }

  // First update local status to submitted
  console.log('[submitSession] Updating session status to submitted');
  await updateSessionStatus(sessionId, 'submitted');

  // Call the Cloud Function
  console.log('[submitSession] Calling Cloud Function...');
  const submitOfficialSession = httpsCallable<
    { sessionId: string },
    SubmitResponse
  >(functions, 'submitOfficialSession');

  try {
    const result = await submitOfficialSession({ sessionId });
    console.log('[submitSession] Success:', result.data);
    return result.data;
  } catch (error: unknown) {
    console.error('[submitSession] Cloud Function error:', error);
    console.error('[submitSession] Error type:', typeof error);
    console.error('[submitSession] Error keys:', error ? Object.keys(error as object) : 'null');

    // Check for Firebase Functions error
    const fbError = error as { code?: string; message?: string; details?: unknown };
    console.error('[submitSession] Error code:', fbError.code);
    console.error('[submitSession] Error message:', fbError.message);
    console.error('[submitSession] Error details:', fbError.details);

    if (fbError.code === 'functions/unauthenticated') {
      throw new Error('認証が必要です。再ログインしてください。');
    }
    if (fbError.code === 'functions/permission-denied') {
      throw new Error('権限がありません。');
    }
    if (fbError.code === 'functions/not-found') {
      throw new Error('セッションが見つかりません。');
    }

    // Show more detailed error for debugging
    const errorMsg = fbError.message || '不明なエラー';
    const errorCode = fbError.code || 'unknown';
    throw new Error(`提出エラー [${errorCode}]: ${errorMsg}`);
  }
}

/**
 * Generate 12 random choices including the correct answer
 */
export function generateChoices(
  correctPoemId: string,
  allPoemIds: string[]
): string[] {
  // Filter out the correct answer
  const otherPoemIds = allPoemIds.filter((id) => id !== correctPoemId);

  // Shuffle and take 11
  const shuffled = [...otherPoemIds].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, 11);

  // Add correct answer and shuffle again
  choices.push(correctPoemId);
  return choices.sort(() => Math.random() - 0.5);
}
