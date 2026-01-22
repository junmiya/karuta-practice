"use strict";
/**
 * コストガード - Firestore読み取り制限とキャッシュ
 *
 * 目標: 月額1万円以内の運用
 *
 * 対策:
 * 1. メモリキャッシュ（TTL付き）
 * 2. レート制限
 * 3. 読み取り上限警告
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
exports.getFromCache = getFromCache;
exports.setInCache = setInCache;
exports.clearCache = clearCache;
exports.getCachedDocument = getCachedDocument;
exports.getCachedRanking = getCachedRanking;
exports.getCachedPoems = getCachedPoems;
exports.checkRateLimit = checkRateLimit;
exports.checkSubmitRateLimit = checkSubmitRateLimit;
exports.incrementReadCount = incrementReadCount;
exports.incrementWriteCount = incrementWriteCount;
exports.incrementFunctionCount = incrementFunctionCount;
exports.getCostMetrics = getCostMetrics;
exports.recordSuspiciousAccess = recordSuspiciousAccess;
exports.isUserBlocked = isUserBlocked;
exports.unblockUser = unblockUser;
exports.getCacheStats = getCacheStats;
exports.cleanupExpiredCache = cleanupExpiredCache;
exports.cleanupRateLimits = cleanupRateLimits;
exports.runCleanup = runCleanup;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const memoryCache = new Map();
// デフォルトTTL（ミリ秒）
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5分
const RANKING_TTL_MS = 10 * 60 * 1000; // 10分（ランキング用）
const POEMS_TTL_MS = 60 * 60 * 1000; // 1時間（歌データ用）
/**
 * キャッシュからデータを取得
 */
function getFromCache(key) {
    const entry = memoryCache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.data;
}
/**
 * キャッシュにデータを保存
 */
function setInCache(key, data, ttlMs = DEFAULT_TTL_MS) {
    memoryCache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
    });
}
/**
 * キャッシュをクリア
 */
function clearCache(keyPattern) {
    if (!keyPattern) {
        memoryCache.clear();
        return;
    }
    for (const key of memoryCache.keys()) {
        if (key.includes(keyPattern)) {
            memoryCache.delete(key);
        }
    }
}
// =============================================================================
// キャッシュ付きFirestore読み取り
// =============================================================================
/**
 * キャッシュ付きドキュメント読み取り
 */
async function getCachedDocument(collection, docId, ttlMs = DEFAULT_TTL_MS) {
    const cacheKey = `doc:${collection}/${docId}`;
    // キャッシュチェック
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
        return cached;
    }
    // Firestoreから読み取り
    const doc = await db.collection(collection).doc(docId).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    setInCache(cacheKey, data, ttlMs);
    return data;
}
/**
 * キャッシュ付きランキング読み取り
 */
async function getCachedRanking(seasonId, division) {
    const cacheKey = `ranking:${seasonId}_${division}`;
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const doc = await db.collection('rankings').doc(`${seasonId}_${division}`).get();
    if (!doc.exists) {
        return null;
    }
    const data = doc.data();
    setInCache(cacheKey, data, RANKING_TTL_MS);
    return data;
}
/**
 * キャッシュ付き歌データ読み取り
 */
async function getCachedPoems() {
    const cacheKey = 'poems:all';
    const cached = getFromCache(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const snapshot = await db.collection('poems').get();
    const poems = snapshot.docs.map((doc) => doc.data());
    setInCache(cacheKey, poems, POEMS_TTL_MS);
    return poems;
}
const rateLimits = new Map();
// レート制限設定
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分間
const DEFAULT_RATE_LIMIT = 60; // 1分間に60回
const SUBMIT_RATE_LIMIT = 10; // 1分間に10回（提出API用）
/**
 * レート制限をチェック
 * @returns true if rate limited (should reject)
 */
function checkRateLimit(uid, action = 'default', limit = DEFAULT_RATE_LIMIT) {
    const key = `${uid}:${action}`;
    const now = Date.now();
    const entry = rateLimits.get(key);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        // 新しいウィンドウを開始
        rateLimits.set(key, { count: 1, windowStart: now });
        return false;
    }
    if (entry.count >= limit) {
        return true; // レート制限に達した
    }
    entry.count++;
    return false;
}
/**
 * 提出APIのレート制限をチェック
 */
function checkSubmitRateLimit(uid) {
    return checkRateLimit(uid, 'submit', SUBMIT_RATE_LIMIT);
}
const costMetrics = {
    firestoreReads: 0,
    firestoreWrites: 0,
    functionInvocations: 0,
    lastResetTime: Date.now(),
};
// 日次リセット間隔
const DAILY_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;
// 警告閾値（Firestoreの無料枠は日50,000読み取り）
const DAILY_READ_WARNING_THRESHOLD = 40000;
const DAILY_WRITE_WARNING_THRESHOLD = 15000;
/**
 * 読み取りカウントを増加
 */
function incrementReadCount(count = 1) {
    checkAndResetDaily();
    costMetrics.firestoreReads += count;
    if (costMetrics.firestoreReads >= DAILY_READ_WARNING_THRESHOLD) {
        console.warn(`[CostGuard] Warning: Daily read count approaching limit (${costMetrics.firestoreReads})`);
    }
}
/**
 * 書き込みカウントを増加
 */
function incrementWriteCount(count = 1) {
    checkAndResetDaily();
    costMetrics.firestoreWrites += count;
    if (costMetrics.firestoreWrites >= DAILY_WRITE_WARNING_THRESHOLD) {
        console.warn(`[CostGuard] Warning: Daily write count approaching limit (${costMetrics.firestoreWrites})`);
    }
}
/**
 * 関数呼び出しカウントを増加
 */
function incrementFunctionCount() {
    checkAndResetDaily();
    costMetrics.functionInvocations++;
}
/**
 * 日次リセットをチェック
 */
function checkAndResetDaily() {
    const now = Date.now();
    if (now - costMetrics.lastResetTime > DAILY_RESET_INTERVAL_MS) {
        console.log(`[CostGuard] Daily reset - Reads: ${costMetrics.firestoreReads}, Writes: ${costMetrics.firestoreWrites}, Invocations: ${costMetrics.functionInvocations}`);
        costMetrics.firestoreReads = 0;
        costMetrics.firestoreWrites = 0;
        costMetrics.functionInvocations = 0;
        costMetrics.lastResetTime = now;
    }
}
/**
 * 現在のコストメトリクスを取得
 */
function getCostMetrics() {
    checkAndResetDaily();
    return { ...costMetrics };
}
const abuseTracking = new Map();
const ABUSE_THRESHOLD = 5; // 5回の疑わしいアクセスでブロック
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30分間ブロック
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000; // 5分間の疑わしいアクセス
/**
 * 疑わしいアクセスを記録
 */
function recordSuspiciousAccess(uid) {
    const now = Date.now();
    const entry = abuseTracking.get(uid);
    if (!entry) {
        abuseTracking.set(uid, {
            suspiciousCount: 1,
            lastSuspiciousTime: now,
            isBlocked: false,
            blockedUntil: 0,
        });
        return;
    }
    // ウィンドウが過ぎていたらリセット
    if (now - entry.lastSuspiciousTime > SUSPICIOUS_WINDOW_MS) {
        entry.suspiciousCount = 1;
        entry.lastSuspiciousTime = now;
        return;
    }
    entry.suspiciousCount++;
    entry.lastSuspiciousTime = now;
    // 閾値を超えたらブロック
    if (entry.suspiciousCount >= ABUSE_THRESHOLD) {
        entry.isBlocked = true;
        entry.blockedUntil = now + BLOCK_DURATION_MS;
        console.warn(`[CostGuard] User ${uid} blocked due to suspicious access pattern`);
    }
}
/**
 * ユーザーがブロックされているかチェック
 */
function isUserBlocked(uid) {
    const entry = abuseTracking.get(uid);
    if (!entry)
        return false;
    if (!entry.isBlocked)
        return false;
    // ブロック期間が過ぎていたら解除
    if (Date.now() > entry.blockedUntil) {
        entry.isBlocked = false;
        entry.suspiciousCount = 0;
        return false;
    }
    return true;
}
/**
 * ブロックを解除（管理者用）
 */
function unblockUser(uid) {
    const entry = abuseTracking.get(uid);
    if (entry) {
        entry.isBlocked = false;
        entry.suspiciousCount = 0;
        entry.blockedUntil = 0;
    }
}
// =============================================================================
// キャッシュ統計
// =============================================================================
/**
 * キャッシュ統計を取得
 */
function getCacheStats() {
    return {
        size: memoryCache.size,
        hitRate: 0, // TODO: ヒット率追跡を実装
        entries: Array.from(memoryCache.keys()),
    };
}
// =============================================================================
// 定期クリーンアップ
// =============================================================================
/**
 * 期限切れキャッシュをクリーンアップ
 */
function cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of memoryCache.entries()) {
        if (now > entry.expiresAt) {
            memoryCache.delete(key);
            cleaned++;
        }
    }
    return cleaned;
}
/**
 * 古いレート制限エントリをクリーンアップ
 */
function cleanupRateLimits() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of rateLimits.entries()) {
        if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
            rateLimits.delete(key);
            cleaned++;
        }
    }
    return cleaned;
}
/**
 * 全クリーンアップを実行
 */
function runCleanup() {
    return {
        cache: cleanupExpiredCache(),
        rateLimits: cleanupRateLimits(),
    };
}
//# sourceMappingURL=costGuard.js.map