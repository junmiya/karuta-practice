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

import * as admin from 'firebase-admin';

const db = admin.firestore();

// =============================================================================
// メモリキャッシュ
// =============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// デフォルトTTL（ミリ秒）
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5分
const RANKING_TTL_MS = 10 * 60 * 1000; // 10分（ランキング用）
const POEMS_TTL_MS = 60 * 60 * 1000; // 1時間（歌データ用）

/**
 * キャッシュからデータを取得
 */
export function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * キャッシュにデータを保存
 */
export function setInCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * キャッシュをクリア
 */
export function clearCache(keyPattern?: string): void {
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
export async function getCachedDocument<T>(
  collection: string,
  docId: string,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T | null> {
  const cacheKey = `doc:${collection}/${docId}`;

  // キャッシュチェック
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Firestoreから読み取り
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as T;
  setInCache(cacheKey, data, ttlMs);

  return data;
}

/**
 * キャッシュ付きランキング読み取り
 */
export async function getCachedRanking<T>(
  seasonId: string,
  division: 'kyu' | 'dan'
): Promise<T | null> {
  const cacheKey = `ranking:${seasonId}_${division}`;
  const cached = getFromCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const doc = await db.collection('rankings').doc(`${seasonId}_${division}`).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as T;
  setInCache(cacheKey, data, RANKING_TTL_MS);

  return data;
}

/**
 * キャッシュ付き歌データ読み取り
 */
export async function getCachedPoems<T>(): Promise<T[]> {
  const cacheKey = 'poems:all';
  const cached = getFromCache<T[]>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const snapshot = await db.collection('poems').get();
  const poems = snapshot.docs.map((doc) => doc.data() as T);

  setInCache(cacheKey, poems, POEMS_TTL_MS);

  return poems;
}

// =============================================================================
// レート制限
// =============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// レート制限設定
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分間
const DEFAULT_RATE_LIMIT = 60; // 1分間に60回
const SUBMIT_RATE_LIMIT = 10; // 1分間に10回（提出API用）

/**
 * レート制限をチェック
 * @returns true if rate limited (should reject)
 */
export function checkRateLimit(
  uid: string,
  action: string = 'default',
  limit: number = DEFAULT_RATE_LIMIT
): boolean {
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
export function checkSubmitRateLimit(uid: string): boolean {
  return checkRateLimit(uid, 'submit', SUBMIT_RATE_LIMIT);
}

// =============================================================================
// コスト監視
// =============================================================================

interface CostMetrics {
  firestoreReads: number;
  firestoreWrites: number;
  functionInvocations: number;
  lastResetTime: number;
}

const costMetrics: CostMetrics = {
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
export function incrementReadCount(count: number = 1): void {
  checkAndResetDaily();
  costMetrics.firestoreReads += count;

  if (costMetrics.firestoreReads >= DAILY_READ_WARNING_THRESHOLD) {
    console.warn(
      `[CostGuard] Warning: Daily read count approaching limit (${costMetrics.firestoreReads})`
    );
  }
}

/**
 * 書き込みカウントを増加
 */
export function incrementWriteCount(count: number = 1): void {
  checkAndResetDaily();
  costMetrics.firestoreWrites += count;

  if (costMetrics.firestoreWrites >= DAILY_WRITE_WARNING_THRESHOLD) {
    console.warn(
      `[CostGuard] Warning: Daily write count approaching limit (${costMetrics.firestoreWrites})`
    );
  }
}

/**
 * 関数呼び出しカウントを増加
 */
export function incrementFunctionCount(): void {
  checkAndResetDaily();
  costMetrics.functionInvocations++;
}

/**
 * 日次リセットをチェック
 */
function checkAndResetDaily(): void {
  const now = Date.now();
  if (now - costMetrics.lastResetTime > DAILY_RESET_INTERVAL_MS) {
    console.log(
      `[CostGuard] Daily reset - Reads: ${costMetrics.firestoreReads}, Writes: ${costMetrics.firestoreWrites}, Invocations: ${costMetrics.functionInvocations}`
    );

    costMetrics.firestoreReads = 0;
    costMetrics.firestoreWrites = 0;
    costMetrics.functionInvocations = 0;
    costMetrics.lastResetTime = now;
  }
}

/**
 * 現在のコストメトリクスを取得
 */
export function getCostMetrics(): CostMetrics {
  checkAndResetDaily();
  return { ...costMetrics };
}

// =============================================================================
// 過剰アクセス防止
// =============================================================================

interface AbuseEntry {
  suspiciousCount: number;
  lastSuspiciousTime: number;
  isBlocked: boolean;
  blockedUntil: number;
}

const abuseTracking = new Map<string, AbuseEntry>();

const ABUSE_THRESHOLD = 5; // 5回の疑わしいアクセスでブロック
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30分間ブロック
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000; // 5分間の疑わしいアクセス

/**
 * 疑わしいアクセスを記録
 */
export function recordSuspiciousAccess(uid: string): void {
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
export function isUserBlocked(uid: string): boolean {
  const entry = abuseTracking.get(uid);
  if (!entry) return false;

  if (!entry.isBlocked) return false;

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
export function unblockUser(uid: string): void {
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
export function getCacheStats(): {
  size: number;
  hitRate: number;
  entries: string[];
} {
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
export function cleanupExpiredCache(): number {
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
export function cleanupRateLimits(): number {
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
export function runCleanup(): { cache: number; rateLimits: number } {
  return {
    cache: cleanupExpiredCache(),
    rateLimits: cleanupRateLimits(),
  };
}
