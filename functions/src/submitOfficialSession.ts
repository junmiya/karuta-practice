/**
 * submitOfficialSession - Callable Function for official competition submission
 * Per constitution v7.0.0 and contracts/callable-functions.md
 * Using v1 for compatibility
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const HttpsError = functions.https.HttpsError;
import { calculateScore } from './services/scoreCalculator';
import {
  validateSession,
  calculateCorrectCount,
  calculateTotalElapsedMs,
  Round,
} from './validators/sessionValidator';
import { updateRanking, updateUserStats } from './services/rankingUpdater';

const db = admin.firestore();

// Request/Response types
interface SubmitRequest {
  sessionId: string;
}

interface SubmitResponse {
  status: 'confirmed' | 'invalid' | 'expired' | 'error';
  score?: number;
  reasons?: string[];
  message?: string;
}

// Session status type
type SessionStatus =
  | 'created'
  | 'in_progress'
  | 'submitted'
  | 'confirmed'
  | 'invalid'
  | 'expired';

// Helper to get JST date key
function getJstDateKey(): string {
  const now = new Date();
  // JST = UTC + 9 hours
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().split('T')[0];
}

export const submitOfficialSession = functions
  .region('asia-northeast1')
  .https.onCall(async (data: SubmitRequest, context): Promise<SubmitResponse> => {
    // 1. Authentication check
    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'ログインが必要です');
    }

    const uid = context.auth.uid;
    const { sessionId } = data;

    if (!sessionId) {
      throw new HttpsError('invalid-argument', 'sessionIdが必要です');
    }

    try {
      // 2. Get session document
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw new HttpsError('not-found', 'セッションが見つかりません');
      }

      const sessionData = sessionDoc.data()!;

      // 3. Authorization check
      if (sessionData.uid !== uid) {
        throw new HttpsError('permission-denied', '権限がありません');
      }

      // 4. Idempotency check - if already processed, return same result
      const status = sessionData.status as SessionStatus;
      if (status === 'confirmed') {
        return {
          status: 'confirmed',
          score: sessionData.score,
        };
      }
      if (status === 'invalid') {
        return {
          status: 'invalid',
          reasons: sessionData.invalidReasons || [],
        };
      }
      if (status === 'expired') {
        return { status: 'expired' };
      }

      // 5. Expiration check (60 minutes)
      const startedAt = sessionData.startedAt?.toDate();
      if (startedAt) {
        const now = new Date();
        const elapsedMs = now.getTime() - startedAt.getTime();
        const sixtyMinutesMs = 60 * 60 * 1000;

        if (elapsedMs > sixtyMinutesMs) {
          await sessionRef.update({
            status: 'expired',
          });
          return { status: 'expired' };
        }
      }

      // 6. Get all rounds
      const roundsSnapshot = await sessionRef.collection('rounds').get();
      const rounds: Round[] = roundsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          roundIndex: data.roundIndex,
          correctPoemId: data.correctPoemId,
          choices: data.choices,
          selectedPoemId: data.selectedPoemId,
          isCorrect: data.isCorrect,
          clientElapsedMs: data.clientElapsedMs,
        };
      });

      // Calculate correctCount and totalElapsedMs from rounds
      const correctCount = calculateCorrectCount(rounds);
      const totalElapsedMs = calculateTotalElapsedMs(rounds);

      // 7. Anomaly detection
      const validationResult = validateSession(
        { correctCount, totalElapsedMs },
        rounds
      );

      if (!validationResult.isValid) {
        // Mark session as invalid
        await sessionRef.update({
          status: 'invalid',
          invalidReasons: validationResult.reasons,
          correctCount,
          totalElapsedMs,
        });

        return {
          status: 'invalid',
          reasons: validationResult.reasons,
        };
      }

      // 8. Calculate score
      const scoreResult = calculateScore({ correctCount, totalElapsedMs });

      // 9. Confirm session
      await sessionRef.update({
        status: 'confirmed',
        score: scoreResult.score,
        correctCount,
        totalElapsedMs,
        confirmedAt: FieldValue.serverTimestamp(),
        dayKeyJst: getJstDateKey(),
      });

      // 10. Get user's nickname and entry info for ranking
      const userDoc = await db.collection('users').doc(uid).get();
      const nickname = userDoc.exists
        ? userDoc.data()?.nickname || 'Anonymous'
        : 'Anonymous';

      // Get entry to find division
      const entryId = sessionData.entryId;
      const entryDoc = await db.collection('entries').doc(entryId).get();
      const division = entryDoc.exists
        ? (entryDoc.data()?.division as 'kyu' | 'dan')
        : 'kyu';

      // 11. Update ranking
      await updateRanking({
        seasonId: sessionData.seasonId,
        division,
        uid,
        nickname,
        newScore: scoreResult.score,
      });

      // 12. Update user stats
      await updateUserStats(uid, scoreResult.score);

      return {
        status: 'confirmed',
        score: scoreResult.score,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('submitOfficialSession error:', error);
      throw new HttpsError('internal', 'エラーが発生しました');
    }
  }
);
