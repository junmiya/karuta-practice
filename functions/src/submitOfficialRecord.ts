import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { calculateScore } from './lib/scoreCalculator';
import { detectAnomalies } from './lib/anomalyDetector';
import { getCurrentJstDate } from './lib/jstDate';
import type { SubmitPayload, SubmitResponse, SubmissionDocument } from './types/submission';

const db = getFirestore();

export const submitOfficialRecord = onCall<SubmitPayload>(
  { region: 'asia-northeast1' },
  async (request): Promise<SubmitResponse> => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    const uid = request.auth.uid;
    const data = request.data;

    // Validate payload
    if (
      typeof data.questionCount !== 'number' ||
      typeof data.correctCount !== 'number' ||
      typeof data.totalElapsedMs !== 'number' ||
      typeof data.avgMs !== 'number'
    ) {
      throw new HttpsError('invalid-argument', 'Invalid payload format');
    }

    // Get user profile for nickname
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError('failed-precondition', 'プロフィールが設定されていません');
    }

    const userData = userDoc.data();
    if (!userData?.nickname || !userData?.banzukeConsent) {
      throw new HttpsError(
        'failed-precondition',
        'ニックネームと番付参加同意が必要です'
      );
    }

    // Calculate score
    const score = calculateScore(data.correctCount, data.totalElapsedMs);

    // Detect anomalies
    const anomalyResult = detectAnomalies(
      data.questionCount,
      data.correctCount,
      data.totalElapsedMs
    );

    // Get JST date
    const dayKeyJst = getCurrentJstDate();

    // Create submission document
    const submission: SubmissionDocument = {
      uid,
      nickname: userData.nickname,
      dayKeyJst,
      questionCount: data.questionCount,
      correctCount: data.correctCount,
      totalElapsedMs: data.totalElapsedMs,
      avgMs: data.avgMs,
      score,
      official: anomalyResult.isValid,
      invalidReasons: anomalyResult.reasons,
      clientSubmittedAt: Timestamp.fromMillis(data.clientSubmittedAt || Date.now()),
      serverSubmittedAt: Timestamp.now(),
    };

    // Save to Firestore
    const docRef = await db.collection('submissions').add(submission);

    return {
      success: true,
      submissionId: docRef.id,
      score,
      official: anomalyResult.isValid,
      invalidReasons: anomalyResult.reasons,
      dayKeyJst,
    };
  }
);
