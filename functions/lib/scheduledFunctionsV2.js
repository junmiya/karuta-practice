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
exports.checkSeasonBoundary = void 0;
/**
 * 102: スケジュール関数V2
 * checkSeasonBoundary: 毎日00:01 JST、節気境界チェック→自動freeze
 */
const functions = __importStar(require("firebase-functions"));
const seasonCalendarService_1 = require("./services/seasonCalendarService");
const pipelineService_1 = require("./services/pipelineService");
const admin = __importStar(require("firebase-admin"));
const utaawase_1 = require("./types/utaawase");
const db = admin.firestore();
/**
 * 毎日00:01 JST に実行
 * 現在日時が新しい節気に入った場合、前の節気の戦をfreezeする
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
        // Check if the previous season needs freezing
        // We need to check if any season_snapshot for any prior season is still in 'draft'
        const seasonOrder = ['spring', 'summer', 'autumn', 'winter'];
        const currentSeasonIndex = seasonOrder.indexOf(currentInfo.seasonId);
        // Check previous season (could be previous year's winter)
        let prevYear = currentInfo.seasonYear;
        let prevSeasonIndex = currentSeasonIndex - 1;
        if (prevSeasonIndex < 0) {
            prevSeasonIndex = 3; // winter
            prevYear -= 1;
        }
        const prevSeasonKey = `${prevYear}_${seasonOrder[prevSeasonIndex]}`;
        // Check if previous season snapshot exists and is draft
        const snapshotRef = db.collection(utaawase_1.UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(prevSeasonKey);
        const snapshotDoc = await snapshotRef.get();
        if (!snapshotDoc.exists) {
            // Check if there are any events for this season
            const eventsSnapshot = await db.collection(utaawase_1.UTAAWASE_COLLECTIONS.EVENTS)
                .where('seasonKey', '==', prevSeasonKey)
                .limit(1)
                .get();
            if (!eventsSnapshot.empty) {
                console.log(`Auto-freezing season: ${prevSeasonKey}`);
                await (0, pipelineService_1.freezeSeason)(prevSeasonKey, 'system');
            }
        }
        else {
            const data = snapshotDoc.data();
            if (data?.pipeline?.status === 'draft') {
                console.log(`Auto-freezing season: ${prevSeasonKey}`);
                await (0, pipelineService_1.freezeSeason)(prevSeasonKey, 'system');
            }
        }
    }
    catch (error) {
        console.error('checkSeasonBoundary error:', error);
    }
});
//# sourceMappingURL=scheduledFunctionsV2.js.map