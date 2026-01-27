"use strict";
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
exports.submitKyuiExam = void 0;
/**
 * 102: 級位検定 - Callable Cloud Function
 * 検定結果を受け取り、即時昇級判定を行う
 */
const functions = __importStar(require("firebase-functions"));
const rulesetService_1 = require("./services/rulesetService");
const userProgressService_1 = require("./services/userProgressService");
const eventService_1 = require("./services/eventService");
const ruleEngine_1 = require("./lib/ruleEngine");
exports.submitKyuiExam = functions
    .region('asia-northeast1')
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }
    const uid = context.auth.uid;
    const { kimarijiFuda, questionCount, correctCount, totalElapsedMs, allCards } = data;
    if (!questionCount || questionCount < 1) {
        throw new functions.https.HttpsError('invalid-argument', 'questionCountが必要です');
    }
    try {
        // Get ruleset and user progress
        const ruleset = await (0, rulesetService_1.getRuleset)();
        if (!ruleset) {
            throw new functions.https.HttpsError('failed-precondition', 'ルールセットが未設定です');
        }
        const progress = await (0, userProgressService_1.getUserProgress)(uid);
        const previousLevel = progress.kyuiLevel;
        const passRate = questionCount > 0 ? (correctCount / questionCount) * 100 : 0;
        // Build exam data for evaluation
        const examData = {
            kimarijiFuda,
            questionCount,
            correctCount,
            totalElapsedMs,
            allCards,
            passRate,
            passed: false, // will be determined below
        };
        // Evaluate promotion
        const result = (0, ruleEngine_1.evaluateKyuiPromotion)(previousLevel, examData, ruleset);
        examData.passed = result.promoted;
        // Record the exam event
        await (0, eventService_1.createKyuiExamEvent)({
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
            await (0, userProgressService_1.updateKyuiLevel)(uid, result.newLevel, result.danEligible);
        }
        return {
            passed: result.promoted,
            promoted: result.promoted,
            previousLevel,
            currentLevel: result.newLevel,
            danEligible: result.danEligible,
            passRate: Math.round(passRate * 10) / 10,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('submitKyuiExam error:', error);
        throw new functions.https.HttpsError('internal', 'エラーが発生しました');
    }
});
//# sourceMappingURL=kyuiExamFunction.js.map