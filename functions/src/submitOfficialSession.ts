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
    console.log('=== submitOfficialSession CALLED ===');

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

      // 6. Get rounds from session document (new format) or subcollection (legacy)
      let rounds: Round[];

      if (sessionData.rounds && Array.isArray(sessionData.rounds) && sessionData.rounds.length > 0) {
        // New format: rounds stored as array in session document
        rounds = sessionData.rounds.map((data: Record<string, unknown>) => ({
          roundIndex: data.roundIndex as number,
          correctPoemId: data.correctPoemId as string,
          choices: data.choices as string[],
          selectedPoemId: data.selectedPoemId as string,
          isCorrect: data.isCorrect as boolean,
          clientElapsedMs: data.clientElapsedMs as number,
        }));
      } else {
        // Legacy format: rounds stored as subcollection (backward compatibility)
        const roundsSnapshot = await sessionRef.collection('rounds').get();
        rounds = roundsSnapshot.docs.map((doc) => {
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
      }

      // Calculate correctCount and totalElapsedMs from rounds
      const correctCount = calculateCorrectCount(rounds);
      const totalElapsedMs = calculateTotalElapsedMs(rounds);
      const roundCount = sessionData.roundCount || 50;

      // 7. Anomaly detection
      const validationResult = validateSession(
        { correctCount, totalElapsedMs, roundCount },
        rounds
      );

      if (!validationResult.isValid) {
        // Mark session as invalid
        await sessionRef.update({
          status: 'invalid',
          invalidReasons: validationResult.reasons,
          invalidReasonCodes: validationResult.reasonCodes || [],
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

      // 9. Get user's nickname and entry info for ranking (parallel fetch)
      const [userDoc, entryDoc] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('entries').doc(sessionData.entryId).get(),
      ]);
      const nickname = userDoc.exists
        ? userDoc.data()?.nickname || 'Anonymous'
        : 'Anonymous';
      const division = entryDoc.exists
        ? (entryDoc.data()?.division as 'kyu' | 'dan')
        : 'kyu';

      // 10. Confirm session (include nickname for faster banzuke queries)
      await sessionRef.update({
        status: 'confirmed',
        score: scoreResult.score,
        correctCount,
        totalElapsedMs,
        nickname,
        confirmedAt: FieldValue.serverTimestamp(),
        dayKeyJst: getJstDateKey(),
      });

      // 11. Update ranking and user stats (parallel)
      await Promise.all([
        updateRanking({
          seasonId: sessionData.seasonId,
          division,
          uid,
          nickname,
          newScore: scoreResult.score,
        }),
        updateUserStats(uid, scoreResult.score),
      ]);

      console.log('=== submitOfficialSession SUCCESS ===', scoreResult.score);

      return {
        status: 'confirmed',
        score: scoreResult.score,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : '';
      console.error('submitOfficialSession error:', errMsg, errStack);
      throw new HttpsError('internal', `エラーが発生しました: ${errMsg}`);
    }
  }
  );
