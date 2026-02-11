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
exports.updateGroupStats = updateGroupStats;
exports.getGroupStats = getGroupStats;
exports.getSeasonGroupRanking = getSeasonGroupRanking;
exports.syncGroupMemberCount = syncGroupMemberCount;
exports.aggregateAllGroupStats = aggregateAllGroupStats;
/**
 * 103: 団体機能 - 団体成績集計サービス
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const group_1 = require("../types/group");
const db = admin.firestore();
/**
 * 団体の成績を更新
 * 試合確定時に呼び出される
 */
async function updateGroupStats(params) {
    const { groupId, seasonKey, score } = params;
    const statsId = `${groupId}_${seasonKey}`;
    const statsRef = db.collection(group_1.GROUP_COLLECTIONS.STATS).doc(statsId);
    const statsDoc = await statsRef.get();
    if (!statsDoc.exists) {
        // 新規作成
        const newStats = {
            statsId,
            groupId,
            seasonKey,
            totalMatches: 1,
            totalScore: score,
            avgScore: score,
            topScore: score,
            memberCount: 0, // 後で更新
            updatedAt: firestore_1.Timestamp.now(),
        };
        await statsRef.set(newStats);
    }
    else {
        // 既存を更新
        const current = statsDoc.data();
        const newTotalMatches = current.totalMatches + 1;
        const newTotalScore = current.totalScore + score;
        const newAvgScore = Math.round(newTotalScore / newTotalMatches);
        const newTopScore = Math.max(current.topScore, score);
        await statsRef.update({
            totalMatches: newTotalMatches,
            totalScore: newTotalScore,
            avgScore: newAvgScore,
            topScore: newTopScore,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
}
/**
 * 団体成績を取得
 */
async function getGroupStats(groupId, seasonKey) {
    const statsId = `${groupId}_${seasonKey}`;
    const doc = await db.collection(group_1.GROUP_COLLECTIONS.STATS).doc(statsId).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
/**
 * シーズンの団体ランキングを取得
 */
async function getSeasonGroupRanking(seasonKey, limit = 50) {
    const snap = await db
        .collection(group_1.GROUP_COLLECTIONS.STATS)
        .where('seasonKey', '==', seasonKey)
        .orderBy('avgScore', 'desc')
        .limit(limit)
        .get();
    const results = [];
    for (const doc of snap.docs) {
        const stats = doc.data();
        // 団体名を取得
        const groupDoc = await db.collection(group_1.GROUP_COLLECTIONS.GROUPS).doc(stats.groupId).get();
        const groupName = groupDoc.exists ? (groupDoc.data()?.name || '不明') : '不明';
        results.push({
            ...stats,
            groupName,
        });
    }
    return results;
}
/**
 * 団体のメンバー数を更新（団体成績に反映）
 */
async function syncGroupMemberCount(groupId) {
    // 現在のアクティブメンバー数を取得
    const membersSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS)
        .where('groupId', '==', groupId)
        .where('status', '==', 'active')
        .count()
        .get();
    const memberCount = membersSnap.data().count;
    // 全シーズンの成績を更新
    const statsSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.STATS)
        .where('groupId', '==', groupId)
        .get();
    const batch = db.batch();
    for (const doc of statsSnap.docs) {
        batch.update(doc.ref, { memberCount });
    }
    await batch.commit();
}
/**
 * 団体成績の定期集計（バッチ処理用）
 */
async function aggregateAllGroupStats(seasonKey) {
    let processed = 0;
    let errors = 0;
    // 全団体を取得
    const groupsSnap = await db
        .collection(group_1.GROUP_COLLECTIONS.GROUPS)
        .where('status', '==', 'active')
        .get();
    for (const groupDoc of groupsSnap.docs) {
        try {
            const groupId = groupDoc.id;
            // この団体に紐づく確定済みセッションを集計
            const sessionsSnap = await db
                .collection('sessions')
                .where('affiliatedGroupId', '==', groupId)
                .where('status', '==', 'confirmed')
                .get();
            if (sessionsSnap.empty)
                continue;
            let totalScore = 0;
            let topScore = 0;
            let count = 0;
            for (const sessionDoc of sessionsSnap.docs) {
                const session = sessionDoc.data();
                const score = session.score || 0;
                totalScore += score;
                topScore = Math.max(topScore, score);
                count++;
            }
            const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
            // メンバー数を取得
            const membersSnap = await db
                .collection(group_1.GROUP_COLLECTIONS.MEMBERSHIPS)
                .where('groupId', '==', groupId)
                .where('status', '==', 'active')
                .count()
                .get();
            const memberCount = membersSnap.data().count;
            // 成績ドキュメントを更新/作成
            const statsId = `${groupId}_${seasonKey}`;
            const statsDoc = {
                statsId,
                groupId,
                seasonKey,
                totalMatches: count,
                totalScore,
                avgScore,
                topScore,
                memberCount,
                updatedAt: firestore_1.Timestamp.now(),
            };
            await db.collection(group_1.GROUP_COLLECTIONS.STATS).doc(statsId).set(statsDoc);
            processed++;
        }
        catch (err) {
            console.error(`Error aggregating stats for group ${groupDoc.id}:`, err);
            errors++;
        }
    }
    return { processed, errors };
}
//# sourceMappingURL=groupStatsService.js.map