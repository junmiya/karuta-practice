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
exports.getUserProgress = getUserProgress;
exports.updateKyuiLevel = updateKyuiLevel;
exports.updateCumulativeScore = updateCumulativeScore;
exports.updateDanLevel = updateDanLevel;
exports.updateDenLevel = updateDenLevel;
exports.updateUtakuraiLevel = updateUtakuraiLevel;
exports.incrementOfficialWinCount = incrementOfficialWinCount;
exports.incrementChampionCount = incrementChampionCount;
/**
 * 102: ユーザー進捗 Firestore CRUD
 * Collection: user_progress/{uid}
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("../types/utaawase");
const db = admin.firestore();
/**
 * ユーザー進捗を取得（なければ初期値を作成）
 */
async function getUserProgress(uid) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    const doc = await ref.get();
    if (doc.exists) {
        return doc.data();
    }
    // Get nickname from users collection
    const userDoc = await db.collection('users').doc(uid).get();
    const nickname = userDoc.exists ? userDoc.data()?.nickname || 'Anonymous' : 'Anonymous';
    const initial = {
        uid,
        nickname,
        kyuiLevel: 'beginner',
        danLevel: null,
        danEligible: false,
        denLevel: null,
        denEligible: false,
        utakuraiLevel: null,
        seasonScores: {},
        officialWinCount: 0,
        championCount: 0,
        totalOfficialMatches: 0,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(initial);
    return initial;
}
/**
 * 級位を更新（即時昇級）
 */
async function updateKyuiLevel(uid, newLevel, danEligible) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    const update = {
        kyuiLevel: newLevel,
        kyuiPromotedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (danEligible) {
        update.danEligible = true;
    }
    await ref.update(update);
}
/**
 * 累積スコアを更新（matchイベント後）
 */
async function updateCumulativeScore(uid, seasonKey, score, isOfficial) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        if (!doc.exists)
            return;
        const data = doc.data();
        const currentScore = data.seasonScores?.[seasonKey] || 0;
        const update = {
            [`seasonScores.${seasonKey}`]: currentScore + score,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (isOfficial) {
            update.totalOfficialMatches = firestore_1.FieldValue.increment(1);
        }
        transaction.update(ref, update);
    });
}
/**
 * 段位を更新（季末確定時）
 */
async function updateDanLevel(uid, newLevel) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    const update = {
        danLevel: newLevel,
        danPromotedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    // 六段到達でden_eligible
    if (newLevel === 'rokudan') {
        update.denEligible = true;
    }
    await ref.update(update);
}
/**
 * 伝位を更新（季末確定時）
 */
async function updateDenLevel(uid, newLevel) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    await ref.update({
        denLevel: newLevel,
        denPromotedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
/**
 * 歌位を更新（季末確定時）
 */
async function updateUtakuraiLevel(uid, newLevel) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    await ref.update({
        utakuraiLevel: newLevel,
        utakuraiPromotedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
/**
 * 上位入賞回数を加算
 */
async function incrementOfficialWinCount(uid) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    await ref.update({
        officialWinCount: firestore_1.FieldValue.increment(1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
/**
 * 優勝回数を加算
 */
async function incrementChampionCount(uid) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.USER_PROGRESS).doc(uid);
    await ref.update({
        championCount: firestore_1.FieldValue.increment(1),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=userProgressService.js.map