"use strict";
/**
 * Ranking updater service with Firestore transaction
 * Updates rankings/{seasonId}_{division} document
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
exports.updateRanking = updateRanking;
exports.updateUserStats = updateUserStats;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const db = admin.firestore();
/**
 * Update ranking document in a transaction
 * - Adds or updates user's entry
 * - Keeps best score
 * - Increments confirmedSessions
 * - Re-sorts and re-ranks all entries
 */
async function updateRanking(input) {
    const { seasonId, division, uid, nickname, newScore } = input;
    const rankingId = `${seasonId}_${division}`;
    const rankingRef = db.collection('rankings').doc(rankingId);
    await db.runTransaction(async (transaction) => {
        const rankingDoc = await transaction.get(rankingRef);
        let entries = [];
        if (rankingDoc.exists) {
            const data = rankingDoc.data();
            entries = data.entries || [];
        }
        // Find existing entry for this user
        const existingIndex = entries.findIndex((e) => e.uid === uid);
        if (existingIndex >= 0) {
            // Update existing entry
            const existing = entries[existingIndex];
            entries[existingIndex] = {
                ...existing,
                nickname, // Update nickname in case it changed
                score: Math.max(existing.score, newScore), // Keep best score
                confirmedSessions: existing.confirmedSessions + 1,
                rank: 0, // Will be recalculated
            };
        }
        else {
            // Add new entry
            entries.push({
                uid,
                nickname,
                score: newScore,
                confirmedSessions: 1,
                rank: 0, // Will be recalculated
            });
        }
        // Sort by score descending
        entries.sort((a, b) => b.score - a.score);
        // Assign ranks (handle ties by giving same rank)
        let currentRank = 1;
        for (let i = 0; i < entries.length; i++) {
            if (i > 0 && entries[i].score < entries[i - 1].score) {
                currentRank = i + 1;
            }
            entries[i].rank = currentRank;
        }
        // Write updated ranking
        const updatedData = {
            seasonId,
            division,
            entries,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        transaction.set(rankingRef, updatedData);
    });
}
/**
 * Update user stats after session confirmation
 */
async function updateUserStats(uid, newScore) {
    const userStatsRef = db.collection('userStats').doc(uid);
    await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(userStatsRef);
        if (statsDoc.exists) {
            const data = statsDoc.data();
            transaction.update(userStatsRef, {
                confirmedSessions: firestore_1.FieldValue.increment(1),
                bestScore: Math.max(data.bestScore || 0, newScore),
            });
        }
        else {
            transaction.set(userStatsRef, {
                totalSessions: 1,
                confirmedSessions: 1,
                bestScore: newScore,
            });
        }
    });
}
//# sourceMappingURL=rankingUpdater.js.map