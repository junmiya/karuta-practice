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
exports.getJobRuns = getJobRuns;
exports.freezeSeason = freezeSeason;
exports.finalizeSeason = finalizeSeason;
exports.publishSeason = publishSeason;
/**
 * 102: 季末確定パイプライン (freeze → finalize → publish)
 * 冪等な状態機械ベース
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const utaawase_1 = require("../types/utaawase");
const eventService_1 = require("./eventService");
const rulesetService_1 = require("./rulesetService");
const promotionService_1 = require("./promotionService");
const db = admin.firestore();
// =============================================================================
// Job Run logging
// =============================================================================
async function createJobRun(jobName, seasonKey, createdBy) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.JOB_RUNS).doc();
    const jobRun = {
        runId: ref.id,
        jobName,
        seasonKey,
        status: 'running',
        startedAt: firestore_1.FieldValue.serverTimestamp(),
        createdBy,
    };
    await ref.set(jobRun);
    return ref.id;
}
async function completeJobRun(runId, status, error, stats) {
    await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.JOB_RUNS).doc(runId).update({
        status,
        completedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(error ? { error } : {}),
        ...(stats ? { stats } : {}),
    });
}
async function getJobRuns(seasonKey) {
    const snapshot = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.JOB_RUNS)
        .where('seasonKey', '==', seasonKey)
        .orderBy('startedAt', 'desc')
        .limit(20)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
// =============================================================================
// Snapshot CRUD
// =============================================================================
async function getOrCreateSnapshot(seasonKey) {
    const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
    const doc = await ref.get();
    if (doc.exists) {
        return doc.data();
    }
    const [yearStr, seasonId] = seasonKey.split('_');
    const year = parseInt(yearStr, 10);
    const initial = {
        snapshotId: seasonKey,
        year,
        seasonId: seasonId,
        seasonKey,
        pipeline: {
            status: 'draft',
            rulesetVersion: '',
        },
        rankings: [],
        promotions: [],
        totalParticipants: 0,
        totalEvents: 0,
        immutable: false,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await ref.set(initial);
    return initial;
}
// =============================================================================
// Freeze
// =============================================================================
async function freezeSeason(seasonKey, triggeredBy) {
    const runId = await createJobRun('freeze', seasonKey, triggeredBy);
    try {
        const snapshot = await getOrCreateSnapshot(seasonKey);
        // Idempotency: skip if already frozen or beyond
        if (snapshot.pipeline.status !== 'draft') {
            await completeJobRun(runId, 'success', undefined, { skipped: 1 });
            return;
        }
        // Gather all match events for this season
        const events = await (0, eventService_1.getSeasonEvents)(seasonKey, 'match');
        // Build cumulative rankings from events
        const scoreMap = new Map();
        for (const event of events) {
            if (event.matchData) {
                const existing = scoreMap.get(event.uid) || { uid: event.uid, nickname: '', total: 0, count: 0 };
                existing.total += event.matchData.score;
                existing.count += 1;
                scoreMap.set(event.uid, existing);
            }
        }
        // Get nicknames
        for (const [uid, entry] of scoreMap) {
            const userDoc = await db.collection('users').doc(uid).get();
            entry.nickname = userDoc.exists ? userDoc.data()?.nickname || 'Anonymous' : 'Anonymous';
        }
        // Sort by cumulative score descending and assign ranks
        const sorted = Array.from(scoreMap.values()).sort((a, b) => b.total - a.total);
        const rankings = [];
        let currentRank = 1;
        for (let i = 0; i < sorted.length; i++) {
            if (i > 0 && sorted[i].total < sorted[i - 1].total) {
                currentRank = i + 1;
            }
            rankings.push({
                uid: sorted[i].uid,
                nickname: sorted[i].nickname,
                rank: currentRank,
                cumulativeScore: sorted[i].total,
                matchCount: sorted[i].count,
            });
        }
        // Get current ruleset version
        const ruleset = await (0, rulesetService_1.getRuleset)();
        const rulesetVersion = ruleset?.version || 'unknown';
        // Update snapshot
        const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
        await ref.update({
            'pipeline.status': 'frozen',
            'pipeline.frozenAt': firestore_1.FieldValue.serverTimestamp(),
            'pipeline.rulesetVersion': rulesetVersion,
            rankings,
            totalParticipants: rankings.length,
            totalEvents: events.length,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await completeJobRun(runId, 'success', undefined, {
            participants: rankings.length,
            events: events.length,
        });
    }
    catch (error) {
        await completeJobRun(runId, 'failed', error.message);
        throw error;
    }
}
// =============================================================================
// Finalize
// =============================================================================
async function finalizeSeason(seasonKey, triggeredBy) {
    const runId = await createJobRun('finalize', seasonKey, triggeredBy);
    try {
        const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
        const doc = await ref.get();
        if (!doc.exists) {
            throw new Error(`Snapshot not found: ${seasonKey}`);
        }
        const snapshot = doc.data();
        // Idempotency
        if (snapshot.pipeline.status === 'finalized' || snapshot.pipeline.status === 'published') {
            await completeJobRun(runId, 'success', undefined, { skipped: 1 });
            return;
        }
        if (snapshot.pipeline.status !== 'frozen') {
            throw new Error(`Cannot finalize: status is ${snapshot.pipeline.status}, expected frozen`);
        }
        // Run promotions (dan, den, utakurai)
        const promotions = await (0, promotionService_1.runPromotions)(snapshot);
        await ref.update({
            'pipeline.status': 'finalized',
            'pipeline.finalizedAt': firestore_1.FieldValue.serverTimestamp(),
            promotions,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await completeJobRun(runId, 'success', undefined, {
            promotions: promotions.length,
        });
    }
    catch (error) {
        await completeJobRun(runId, 'failed', error.message);
        throw error;
    }
}
// =============================================================================
// Publish
// =============================================================================
async function publishSeason(seasonKey, triggeredBy) {
    const runId = await createJobRun('publish', seasonKey, triggeredBy);
    try {
        const ref = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
        const doc = await ref.get();
        if (!doc.exists) {
            throw new Error(`Snapshot not found: ${seasonKey}`);
        }
        const snapshot = doc.data();
        // Idempotency
        if (snapshot.pipeline.status === 'published') {
            await completeJobRun(runId, 'success', undefined, { skipped: 1 });
            return;
        }
        if (snapshot.pipeline.status !== 'finalized') {
            throw new Error(`Cannot publish: status is ${snapshot.pipeline.status}, expected finalized`);
        }
        await ref.update({
            'pipeline.status': 'published',
            'pipeline.publishedAt': firestore_1.FieldValue.serverTimestamp(),
            immutable: true,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        await completeJobRun(runId, 'success');
    }
    catch (error) {
        await completeJobRun(runId, 'failed', error.message);
        throw error;
    }
}
//# sourceMappingURL=pipelineService.js.map