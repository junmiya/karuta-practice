"use strict";
/**
 * Scheduled Functions for daily operations
 * Per constitution v7.0.0 - Scheduled Functions are allowed in Stage 0
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
exports.expireStaleSession = exports.updateSeasonStatus = exports.dailyRankingSnapshot = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Daily ranking snapshot - runs at 00:05 JST daily
 * Captures daily top scores for each division
 */
exports.dailyRankingSnapshot = functions
    .region('asia-northeast1')
    .pubsub.schedule('5 0 * * *') // 00:05 UTC = 09:05 JST (adjusted for JST midnight)
    .timeZone('Asia/Tokyo')
    .onRun(async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstYesterday = new Date(yesterday.getTime() + jstOffset);
    const dayKeyJst = jstYesterday.toISOString().split('T')[0];
    console.log(`Running daily ranking snapshot for ${dayKeyJst}`);
    try {
        // Get all confirmed sessions for yesterday
        const sessionsSnapshot = await db
            .collection('sessions')
            .where('status', '==', 'confirmed')
            .where('dayKeyJst', '==', dayKeyJst)
            .get();
        if (sessionsSnapshot.empty) {
            console.log('No confirmed sessions found for yesterday');
            return null;
        }
        // Group by seasonId and division
        const dailyScores = new Map();
        for (const doc of sessionsSnapshot.docs) {
            const session = doc.data();
            const entryDoc = await db
                .collection('entries')
                .doc(session.entryId)
                .get();
            if (!entryDoc.exists)
                continue;
            const entry = entryDoc.data();
            const key = `${session.seasonId}_${entry.division}`;
            // Get user nickname
            const userDoc = await db.collection('users').doc(session.uid).get();
            const nickname = userDoc.exists
                ? userDoc.data()?.nickname || 'Anonymous'
                : 'Anonymous';
            if (!dailyScores.has(key)) {
                dailyScores.set(key, []);
            }
            dailyScores.get(key).push({
                uid: session.uid,
                nickname,
                score: session.score,
            });
        }
        // Save daily snapshots
        const batch = db.batch();
        for (const [key, scores] of dailyScores) {
            // Sort by score descending and take top 100
            scores.sort((a, b) => b.score - a.score);
            const topScores = scores.slice(0, 100);
            // Assign ranks
            let currentRank = 1;
            const rankedEntries = topScores.map((entry, i) => {
                if (i > 0 && entry.score < topScores[i - 1].score) {
                    currentRank = i + 1;
                }
                return { ...entry, rank: currentRank };
            });
            const dailyDocRef = db
                .collection('dailyRankings')
                .doc(`${key}_${dayKeyJst}`);
            batch.set(dailyDocRef, {
                seasonId: key.split('_')[0] + '_' + key.split('_')[1],
                division: key.split('_')[2],
                dayKeyJst,
                entries: rankedEntries,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        console.log(`Daily ranking snapshot completed for ${dayKeyJst}`);
        return null;
    }
    catch (error) {
        console.error('Error in dailyRankingSnapshot:', error);
        throw error;
    }
});
/**
 * Season status updater - runs at 00:01 JST daily
 * Updates season status based on current date
 */
exports.updateSeasonStatus = functions
    .region('asia-northeast1')
    .pubsub.schedule('1 0 * * *')
    .timeZone('Asia/Tokyo')
    .onRun(async () => {
    const now = new Date();
    console.log(`Running season status update at ${now.toISOString()}`);
    try {
        const seasonsSnapshot = await db.collection('seasons').get();
        const batch = db.batch();
        let updatedCount = 0;
        for (const doc of seasonsSnapshot.docs) {
            const season = doc.data();
            const startDate = season.startDate.toDate();
            const endDate = season.endDate.toDate();
            let newStatus;
            if (now < startDate) {
                newStatus = 'upcoming';
            }
            else if (now > endDate) {
                newStatus = 'ended';
            }
            else {
                newStatus = 'active';
            }
            if (season.status !== newStatus) {
                batch.update(doc.ref, { status: newStatus });
                console.log(`  Season ${season.seasonId}: ${season.status} -> ${newStatus}`);
                updatedCount++;
            }
        }
        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Updated ${updatedCount} season(s)`);
        }
        else {
            console.log('No season status changes needed');
        }
        return null;
    }
    catch (error) {
        console.error('Error in updateSeasonStatus:', error);
        throw error;
    }
});
/**
 * Expire stale sessions - runs every hour
 * Marks sessions older than 60 minutes as expired
 */
exports.expireStaleSession = functions
    .region('asia-northeast1')
    .pubsub.schedule('0 * * * *') // Every hour at :00
    .timeZone('Asia/Tokyo')
    .onRun(async () => {
    const sixtyMinutesAgo = new Date();
    sixtyMinutesAgo.setMinutes(sixtyMinutesAgo.getMinutes() - 60);
    console.log(`Expiring sessions started before ${sixtyMinutesAgo.toISOString()}`);
    try {
        // Find sessions that are in_progress or submitted but started > 60 min ago
        const sessionsSnapshot = await db
            .collection('sessions')
            .where('status', 'in', ['created', 'in_progress', 'submitted'])
            .where('startedAt', '<', sixtyMinutesAgo)
            .get();
        if (sessionsSnapshot.empty) {
            console.log('No stale sessions found');
            return null;
        }
        const batch = db.batch();
        for (const doc of sessionsSnapshot.docs) {
            batch.update(doc.ref, { status: 'expired' });
        }
        await batch.commit();
        console.log(`Expired ${sessionsSnapshot.size} stale session(s)`);
        return null;
    }
    catch (error) {
        console.error('Error in expireStaleSession:', error);
        throw error;
    }
});
//# sourceMappingURL=scheduledFunctions.js.map