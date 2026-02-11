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
exports.aggregateGroupStats = exports.checkSeasonBoundary = void 0;
/**
 * 102: スケジュール関数V2
 * checkSeasonBoundary: 毎日00:01 JST、節気境界チェック→自動freeze/finalize/publish
 */
const functions = __importStar(require("firebase-functions"));
const seasonCalendarService_1 = require("./services/seasonCalendarService");
const pipelineService_1 = require("./services/pipelineService");
const groupStatsService_1 = require("./services/groupStatsService");
const admin = __importStar(require("firebase-admin"));
const utaawase_1 = require("./types/utaawase");
const db = admin.firestore();
// 24時間（ミリ秒）
const FINALIZE_DELAY_MS = 24 * 60 * 60 * 1000;
/**
 * 毎日00:01 JST に実行
 * - 新しい節気に入った場合、前の節気の戦をfreezeする
 * - frozen から24時間経過したら自動finalize
 * - finalized になったら即時publish
 */
exports.checkSeasonBoundary = functions
    .region('asia-northeast1')
    .pubsub.schedule('1 0 * * *')
    .timeZone('Asia/Tokyo')
    .onRun(async () => {
    try {
        const now = new Date();
        const currentInfo = await (0, seasonCalendarService_1.getCurrentSeasonInfo)(now);
        if (!currentInfo) {
            console.log('No active season calendar found');
            return;
        }
        console.log(`Current season: ${currentInfo.seasonKey}`);
        // Check if the previous season needs processing
        const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
        const currentSeasonIndex = seasonOrder.indexOf(currentInfo.seasonId);
        // Calculate previous season
        let prevYear = currentInfo.seasonYear;
        let prevSeasonIndex = currentSeasonIndex - 1;
        if (prevSeasonIndex < 0) {
            prevSeasonIndex = 3; // winter
            prevYear -= 1;
        }
        const prevSeasonKey = `${prevYear}_${seasonOrder[prevSeasonIndex]}`;
        // Process previous season through pipeline
        await processSeasonPipeline(prevSeasonKey, now);
        // Also check current season (for manual interventions that might be pending)
        await processSeasonPipeline(currentInfo.seasonKey, now);
    }
    catch (error) {
        console.error('checkSeasonBoundary error:', error);
    }
});
/**
 * シーズンのパイプライン状態をチェックし、次ステップを自動実行
 */
async function processSeasonPipeline(seasonKey, now) {
    const snapshotRef = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
    const snapshotDoc = await snapshotRef.get();
    if (!snapshotDoc.exists) {
        // Check if there are any events for this season
        const eventsSnapshot = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS)
            .where('seasonKey', '==', seasonKey)
            .limit(1)
            .get();
        if (!eventsSnapshot.empty) {
            console.log(`Auto-freezing season: ${seasonKey}`);
            await (0, pipelineService_1.freezeSeason)(seasonKey, 'system');
        }
        return;
    }
    const snapshot = snapshotDoc.data();
    const status = snapshot.pipeline?.status;
    // Draft → Freeze (if season ended)
    if (status === 'draft') {
        console.log(`Auto-freezing season: ${seasonKey}`);
        await (0, pipelineService_1.freezeSeason)(seasonKey, 'system');
        return;
    }
    // Frozen → Finalize (after 24 hours)
    if (status === 'frozen') {
        const frozenAt = snapshot.pipeline?.frozenAt;
        if (frozenAt) {
            const frozenTime = frozenAt.toMillis();
            const elapsed = now.getTime() - frozenTime;
            if (elapsed >= FINALIZE_DELAY_MS) {
                console.log(`Auto-finalizing season: ${seasonKey} (frozen for ${Math.floor(elapsed / 3600000)}h)`);
                await (0, pipelineService_1.finalizeSeason)(seasonKey, 'system');
                // Continue to publish
                console.log(`Auto-publishing season: ${seasonKey}`);
                await (0, pipelineService_1.publishSeason)(seasonKey, 'system');
            }
            else {
                console.log(`Season ${seasonKey} frozen, waiting for finalize (${Math.floor((FINALIZE_DELAY_MS - elapsed) / 3600000)}h remaining)`);
            }
        }
        return;
    }
    // Finalized → Publish (immediately)
    if (status === 'finalized') {
        console.log(`Auto-publishing season: ${seasonKey}`);
        await (0, pipelineService_1.publishSeason)(seasonKey, 'system');
        return;
    }
    // Published → Already done
    if (status === 'published') {
        console.log(`Season ${seasonKey} already published`);
    }
}
// =============================================================================
// 103: 団体成績の定期集計
// =============================================================================
/**
 * T050: 毎日02:00 JST に実行
 * - 全団体の成績を再集計する
 */
exports.aggregateGroupStats = functions
    .region('asia-northeast1')
    .pubsub.schedule('0 2 * * *')
    .timeZone('Asia/Tokyo')
    .onRun(async () => {
    try {
        const now = new Date();
        const currentInfo = await (0, seasonCalendarService_1.getCurrentSeasonInfo)(now);
        if (!currentInfo) {
            console.log('No active season calendar found for group stats aggregation');
            return;
        }
        console.log(`Aggregating group stats for season: ${currentInfo.seasonKey}`);
        const result = await (0, groupStatsService_1.aggregateAllGroupStats)(currentInfo.seasonKey);
        console.log(`Group stats aggregation complete: processed=${result.processed}, errors=${result.errors}`);
    }
    catch (error) {
        console.error('aggregateGroupStats error:', error);
    }
});
//# sourceMappingURL=scheduledFunctionsV2.js.map