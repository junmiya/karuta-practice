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
exports.generateSeasonId = generateSeasonId;
exports.generateSeasonName = generateSeasonName;
exports.getSeason = getSeason;
exports.getActiveSeason = getActiveSeason;
exports.createSeason = createSeason;
exports.transitionSeasonStatus = transitionSeasonStatus;
exports.freezeSeason = freezeSeason;
exports.finalizeSeason = finalizeSeason;
exports.archiveSeason = archiveSeason;
exports.getAllSeasons = getAllSeasons;
exports.getSeasonsByStatus = getSeasonsByStatus;
/**
 * 段階1: シーズン管理サービス
 *
 * シーズンの状態遷移（open → frozen → finalized → archived）を管理
 */
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const stage1_1 = require("../types/stage1");
const auditService_1 = require("./auditService");
const db = admin.firestore();
/**
 * シーズンIDを生成
 * @param year 年（例: 2026）
 * @param term 期（spring | summer | autumn | winter）
 */
function generateSeasonId(year, term) {
    return `${year}_${term}`;
}
/**
 * シーズン名を生成（日本語表示用）
 */
function generateSeasonName(year, term) {
    const termNames = {
        spring: '春場所',
        summer: '夏場所',
        autumn: '秋場所',
        winter: '冬場所',
    };
    return `${year}年${termNames[term]}`;
}
/**
 * シーズンを取得
 */
async function getSeason(seasonId) {
    const doc = await db.collection(stage1_1.COLLECTIONS.SEASONS).doc(seasonId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data();
}
/**
 * 現在アクティブなシーズン（open状態）を取得
 */
async function getActiveSeason() {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.SEASONS)
        .where('status', '==', 'open')
        .limit(1)
        .get();
    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
}
/**
 * シーズンを作成
 */
async function createSeason(year, term, startDate) {
    const seasonId = generateSeasonId(year, term);
    const name = generateSeasonName(year, term);
    const now = firestore_1.Timestamp.now();
    const season = {
        seasonId,
        name,
        status: 'open',
        startDate: firestore_1.Timestamp.fromDate(startDate),
        createdAt: now,
        updatedAt: now,
    };
    await db.collection(stage1_1.COLLECTIONS.SEASONS).doc(seasonId).set(season);
    // 監査ログ（シーズン作成）
    await (0, auditService_1.writeAuditLog)({
        eventType: 'season_frozen', // 作成時は専用タイプがないためfrozenを流用
        seasonId,
        details: {
            action: 'created',
            status: 'open',
            name,
        },
    }).catch((err) => console.error('Audit log failed:', err));
    return season;
}
/**
 * シーズン状態を遷移
 *
 * 許可される遷移:
 * - open → frozen
 * - frozen → finalized
 * - finalized → archived
 */
async function transitionSeasonStatus(seasonId, newStatus) {
    const seasonRef = db.collection(stage1_1.COLLECTIONS.SEASONS).doc(seasonId);
    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(seasonRef);
        if (!doc.exists) {
            throw new Error(`Season not found: ${seasonId}`);
        }
        const season = doc.data();
        const currentStatus = season.status;
        // 状態遷移のバリデーション
        const validTransitions = {
            open: ['frozen'],
            frozen: ['finalized'],
            finalized: ['archived'],
            archived: [],
        };
        if (!validTransitions[currentStatus].includes(newStatus)) {
            throw new Error(`Invalid transition: ${currentStatus} → ${newStatus} for season ${seasonId}`);
        }
        const now = firestore_1.Timestamp.now();
        const updates = {
            status: newStatus,
            updatedAt: now,
        };
        // 状態に応じた日時を記録
        switch (newStatus) {
            case 'frozen':
                updates.freezeDate = now;
                break;
            case 'finalized':
                updates.finalizeDate = now;
                break;
            case 'archived':
                updates.archiveDate = now;
                break;
        }
        transaction.update(seasonRef, updates);
        // トランザクション外で監査ログを書く
        if (newStatus === 'frozen') {
            setImmediate(() => {
                (0, auditService_1.logSeasonFrozen)(seasonId, 0, 'system').catch(console.error);
            });
        }
        else if (newStatus === 'finalized' || newStatus === 'archived') {
            setImmediate(() => {
                (0, auditService_1.writeAuditLog)({
                    eventType: newStatus === 'finalized' ? 'season_finalized' : 'season_frozen',
                    seasonId,
                    details: {
                        previousStatus: currentStatus,
                        newStatus,
                    },
                }).catch(console.error);
            });
        }
        return { ...season, ...updates };
    });
}
/**
 * シーズンを凍結（frozen）
 */
async function freezeSeason(seasonId) {
    return transitionSeasonStatus(seasonId, 'frozen');
}
/**
 * シーズンを確定（finalized）
 */
async function finalizeSeason(seasonId) {
    return transitionSeasonStatus(seasonId, 'finalized');
}
/**
 * シーズンをアーカイブ（archived）
 */
async function archiveSeason(seasonId) {
    return transitionSeasonStatus(seasonId, 'archived');
}
/**
 * 全シーズンを取得（管理用）
 */
async function getAllSeasons() {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.SEASONS)
        .orderBy('startDate', 'desc')
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
/**
 * 状態別シーズンを取得
 */
async function getSeasonsByStatus(status) {
    const snapshot = await db
        .collection(stage1_1.COLLECTIONS.SEASONS)
        .where('status', '==', status)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
//# sourceMappingURL=seasonService.js.map