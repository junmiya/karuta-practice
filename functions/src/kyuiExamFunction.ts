/**
 * 102: 級位検定 - Callable Cloud Function
 * 検定結果を受け取り、即時昇級判定を行う
 */
import * as functions from 'firebase-functions';
import { getRuleset } from './services/rulesetService';
import { getUserProgress, updateKyuiLevel } from './services/userProgressService';
import { createKyuiExamEvent } from './services/eventService';
import { evaluateKyuiPromotion } from './lib/ruleEngine';
import { KyuiExamEventData } from './types/utaawase';

interface KyuiExamRequest {
  kimarijiFuda: number | null;
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
}

interface KyuiExamResponse {
  passed: boolean;
  promoted: boolean;
  previousLevel: string;
  currentLevel: string;
  danEligible: boolean;
  passRate: number;
}

export const submitKyuiExam = functions
  .region('asia-northeast1')
  .https.onCall(async (data: KyuiExamRequest, context): Promise<KyuiExamResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }

    const uid = context.auth.uid;
    const { kimarijiFuda, questionCount, correctCount, totalElapsedMs, allCards } = data;

    if (!questionCount || questionCount < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'questionCountが必要です');
    }

    // T4 acceptance: 50枚超過 or 10分(600秒)超過は不合格
    if (questionCount > 50) {
      throw new functions.https.HttpsError('invalid-argument', '出題数は最大50問です');
    }
    if (totalElapsedMs > 600_000) {
      throw new functions.https.HttpsError('invalid-argument', '検定の制限時間(10分)を超過しています');
    }

    try {
      // Get ruleset and user progress
      const ruleset = await getRuleset();
      if (!ruleset) {
        throw new functions.https.HttpsError('failed-precondition', 'ルールセットが未設定です');
      }

      const progress = await getUserProgress(uid);
      const previousLevel = progress.kyuiLevel;

      const passRate = questionCount > 0 ? (correctCount / questionCount) * 100 : 0;

      // Build exam data for evaluation
      const examData: KyuiExamEventData = {
        kimarijiFuda,
        questionCount,
        correctCount,
        totalElapsedMs,
        allCards,
        passRate,
        passed: false, // will be determined below
      };

      // Evaluate promotion
      const result = evaluateKyuiPromotion(previousLevel, examData, ruleset);
      examData.passed = result.promoted;

      // Record the exam event
      await createKyuiExamEvent({
        uid,
        kimarijiFuda,
        questionCount,
        correctCount,
        totalElapsedMs,
        allCards,
        passed: result.promoted,
        startedAt: new Date(),
      });

      // Apply promotion if passed
      if (result.promoted) {
        await updateKyuiLevel(uid, result.newLevel, result.danEligible);
      }

      return {
        passed: result.promoted,
        promoted: result.promoted,
        previousLevel,
        currentLevel: result.newLevel,
        danEligible: result.danEligible,
        passRate: Math.round(passRate * 10) / 10,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('submitKyuiExam error:', error);
      throw new functions.https.HttpsError('internal', 'エラーが発生しました');
    }
  });
