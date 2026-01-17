"use strict";
/**
 * submitOfficialSession - Callable Function for official competition submission
 * Per constitution v7.0.0 and contracts/callable-functions.md
 * Using v1 for compatibility
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitOfficialSession = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const HttpsError = functions.https.HttpsError;
const scoreCalculator_1 = require("./services/scoreCalculator");
const sessionValidator_1 = require("./validators/sessionValidator");
const rankingUpdater_1 = require("./services/rankingUpdater");
const db = admin.firestore();
// Helper to get JST date key
function getJstDateKey() {
    const now = new Date();
    // JST = UTC + 9 hours
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    return jstDate.toISOString().split('T')[0];
}
exports.submitOfficialSession = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
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
        const sessionData = sessionDoc.data();
        // 3. Authorization check
        if (sessionData.uid !== uid) {
            throw new HttpsError('permission-denied', '権限がありません');
        }
        // 4. Idempotency check - if already processed, return same result
        const status = sessionData.status;
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
        const rounds = roundsSnapshot.docs.map((doc) => {
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
        const correctCount = (0, sessionValidator_1.calculateCorrectCount)(rounds);
        const totalElapsedMs = (0, sessionValidator_1.calculateTotalElapsedMs)(rounds);
        // 7. Anomaly detection
        const validationResult = (0, sessionValidator_1.validateSession)({ correctCount, totalElapsedMs }, rounds);
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
        const scoreResult = (0, scoreCalculator_1.calculateScore)({ correctCount, totalElapsedMs });
        // 9. Confirm session
        await sessionRef.update({
            status: 'confirmed',
            score: scoreResult.score,
            correctCount,
            totalElapsedMs,
            confirmedAt: firestore_1.FieldValue.serverTimestamp(),
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
            ? entryDoc.data()?.division
            : 'kyu';
        // 11. Update ranking
        await (0, rankingUpdater_1.updateRanking)({
            seasonId: sessionData.seasonId,
            division,
            uid,
            nickname,
            newScore: scoreResult.score,
        });
        // 12. Update user stats
        await (0, rankingUpdater_1.updateUserStats)(uid, scoreResult.score);
        return {
            status: 'confirmed',
            score: scoreResult.score,
        };
    }
    catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error('submitOfficialSession error:', error);
        throw new HttpsError('internal', 'エラーが発生しました');
    }
});
//# sourceMappingURL=submitOfficialSession.js.map