"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitOfficialRecord = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const scoreCalculator_1 = require("./lib/scoreCalculator");
const anomalyDetector_1 = require("./lib/anomalyDetector");
const jstDate_1 = require("./lib/jstDate");
const db = (0, firestore_1.getFirestore)();
exports.submitOfficialRecord = (0, https_1.onCall)({ region: 'asia-northeast1' }, async (request) => {
    // Auth check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', '認証が必要です');
    }
    const uid = request.auth.uid;
    const data = request.data;
    // Validate payload
    if (typeof data.questionCount !== 'number' ||
        typeof data.correctCount !== 'number' ||
        typeof data.totalElapsedMs !== 'number' ||
        typeof data.avgMs !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Invalid payload format');
    }
    // Get user profile for nickname
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('failed-precondition', 'プロフィールが設定されていません');
    }
    const userData = userDoc.data();
    if (!userData?.nickname || !userData?.banzukeConsent) {
        throw new https_1.HttpsError('failed-precondition', 'ニックネームと番付参加同意が必要です');
    }
    // Calculate score
    const score = (0, scoreCalculator_1.calculateScore)(data.correctCount, data.totalElapsedMs);
    // Detect anomalies
    const anomalyResult = (0, anomalyDetector_1.detectAnomalies)(data.questionCount, data.correctCount, data.totalElapsedMs);
    // Get JST date
    const dayKeyJst = (0, jstDate_1.getCurrentJstDate)();
    // Create submission document
    const submission = {
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
        clientSubmittedAt: firestore_1.Timestamp.fromMillis(data.clientSubmittedAt || Date.now()),
        serverSubmittedAt: firestore_1.Timestamp.now(),
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
});
//# sourceMappingURL=submitOfficialRecord.js.map