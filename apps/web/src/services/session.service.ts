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
import { db, functions } from './firebase';
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
  // First update local status to submitted
  await updateSessionStatus(sessionId, 'submitted');

  // Call the Cloud Function
  const submitOfficialSession = httpsCallable<
    { sessionId: string },
    SubmitResponse
  >(functions, 'submitOfficialSession');

  const result = await submitOfficialSession({ sessionId });
  return result.data;
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
