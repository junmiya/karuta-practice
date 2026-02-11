/**
 * 段階1: Scheduled Functions
 *
 * - generateDailyReflections: 日次上位3セッション記録
 * - updateRankingsCache: 暫定ランキング更新
 * - checkSeasonTransition: シーズン状態遷移チェック
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  Division,
  DailyReflection,
  TopSession,
  RankingCache,
  RankingEntry,
  BanzukeSnapshot,
  BanzukeEntry,
  COLLECTIONS,
  rankingDocId,
  dailyReflectionDocId,
  banzukeDocId,
  TITLE_REQUIREMENTS,
} from './types/stage1';
import {
  getSeasonsByStatus,
  finalizeSeason,
} from './services/seasonService';
import {
  logSeasonFinalized,
  logTitleAwarded,
} from './services/auditService';
import {
  runCleanup,
  getCostMetrics,
} from './lib/costGuard';

const db = admin.firestore();

// =============================================================================
// S1_T02: generateDailyReflections
// =============================================================================

/**
 * 日次上位3セッション記録を生成
 * 毎日 00:05 JST に実行
 */
export const generateDailyReflections = functions
  .region('asia-northeast1')
  .pubsub.schedule('5 0 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    // 昨日のJST日付を取得
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    jstNow.setDate(jstNow.getDate() - 1);
    const dayKeyJst = jstNow.toISOString().split('T')[0];

    console.log(`[generateDailyReflections] Processing ${dayKeyJst}`);

    try {
      // openまたはfrozen状態のシーズンを取得
      const openSeasons = await getSeasonsByStatus('open');
      const frozenSeasons = await getSeasonsByStatus('frozen');
      const activeSeasons = [...openSeasons, ...frozenSeasons];

      if (activeSeasons.length === 0) {
        console.log('[generateDailyReflections] No active seasons found');
        return null;
      }

      for (const season of activeSeasons) {
        await generateDailyReflectionForSeason(season.seasonId, dayKeyJst);
      }

      console.log(`[generateDailyReflections] Completed for ${dayKeyJst}`);
      return null;
    } catch (error) {
      console.error('[generateDailyReflections] Error:', error);
      throw error;
    }
  });

/**
 * 特定シーズンの日次反映を生成
 */
async function generateDailyReflectionForSeason(
  seasonId: string,
  dayKeyJst: string
): Promise<void> {
  const divisions: Division[] = ['kyu', 'dan'];

  for (const division of divisions) {
    // 当日のconfirmed sessionsを取得（上位3件）
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('seasonId', '==', seasonId)
      .where('status', '==', 'confirmed')
      .where('dayKeyJst', '==', dayKeyJst)
      .orderBy('score', 'desc')
      .limit(10) // 少し多めに取得してdivisionでフィルタ
      .get();

    if (sessionsSnapshot.empty) {
      console.log(
        `[generateDailyReflections] No sessions for ${seasonId}/${division}/${dayKeyJst}`
      );
      continue;
    }

    // divisionでフィルタしてtop3を取得
    const topSessions: TopSession[] = [];

    for (const doc of sessionsSnapshot.docs) {
      if (topSessions.length >= 3) break;

      const session = doc.data();

      // エントリーからdivisionを取得
      const entryDoc = await db
        .collection('entries')
        .doc(session.entryId)
        .get();

      if (!entryDoc.exists) continue;
      const entry = entryDoc.data()!;
      if (entry.division !== division) continue;

      // ユーザー情報を取得
      const userDoc = await db.collection('users').doc(session.uid).get();
      const nickname = userDoc.exists
        ? userDoc.data()?.nickname || 'Anonymous'
        : 'Anonymous';

      topSessions.push({
        sessionId: doc.id,
        uid: session.uid,
        nickname,
        score: session.score,
        correctCount: session.correctCount,
        totalElapsedMs: session.totalElapsedMs,
        submittedAt: session.confirmedAt || session.submittedAt,
      });
    }

    if (topSessions.length === 0) {
      console.log(
        `[generateDailyReflections] No sessions for division ${division} on ${dayKeyJst}`
      );
      continue;
    }

    // dailyReflections ドキュメントを作成
    const docId = dailyReflectionDocId(seasonId, division, dayKeyJst);
    const dailyReflection: DailyReflection = {
      seasonId,
      division,
      dayKeyJst,
      topSessions,
      createdAt: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.DAILY_REFLECTIONS).doc(docId).set(dailyReflection);

    console.log(
      `[generateDailyReflections] Created ${docId} with ${topSessions.length} sessions`
    );
  }
}

// =============================================================================
// S1_T03: updateRankingsCache
// =============================================================================

/**
 * 暫定ランキングキャッシュを更新
 * 5〜15分間隔で実行（ここでは10分間隔）
 */
export const updateRankingsCache = functions
  .region('asia-northeast1')
  .pubsub.schedule('*/10 * * * *') // 10分ごと
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    console.log('[updateRankingsCache] Starting...');

    try {
      // open状態のシーズンのみ更新
      const openSeasons = await getSeasonsByStatus('open');

      if (openSeasons.length === 0) {
        console.log('[updateRankingsCache] No open seasons found');
        return null;
      }

      for (const season of openSeasons) {
        await updateRankingsCacheForSeason(season.seasonId);
      }

      console.log('[updateRankingsCache] Completed');
      return null;
    } catch (error) {
      console.error('[updateRankingsCache] Error:', error);
      throw error;
    }
  });

/**
 * 特定シーズンのランキングキャッシュを更新
 */
async function updateRankingsCacheForSeason(seasonId: string): Promise<void> {
  const divisions: Division[] = ['kyu', 'dan'];

  for (const division of divisions) {
    // ユーザーごとのベストスコアを集計
    const userScores = new Map<
      string,
      {
        uid: string;
        nickname: string;
        score: number;
        sessionCount: number;
        lastReflectedSubmittedAt: Timestamp;
      }
    >();

    // confirmed sessionsを取得
    // TODO: 大量データ対応（ページネーション等）
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('seasonId', '==', seasonId)
      .where('status', '==', 'confirmed')
      .get();

    for (const doc of sessionsSnapshot.docs) {
      const session = doc.data();

      // エントリーからdivisionを確認
      const entryDoc = await db
        .collection('entries')
        .doc(session.entryId)
        .get();

      if (!entryDoc.exists) continue;
      const entry = entryDoc.data()!;
      if (entry.division !== division) continue;

      // ユーザー情報を取得
      const userDoc = await db.collection('users').doc(session.uid).get();
      const nickname = userDoc.exists
        ? userDoc.data()?.nickname || 'Anonymous'
        : 'Anonymous';

      const existing = userScores.get(session.uid);
      const submittedAt = session.confirmedAt || session.submittedAt;

      if (!existing) {
        userScores.set(session.uid, {
          uid: session.uid,
          nickname,
          score: session.score,
          sessionCount: 1,
          lastReflectedSubmittedAt: submittedAt,
        });
      } else {
        // ベストスコアを更新
        if (session.score > existing.score) {
          existing.score = session.score;
        }
        existing.sessionCount++;
        // 最新の提出時刻を記録
        if (submittedAt.toMillis() > existing.lastReflectedSubmittedAt.toMillis()) {
          existing.lastReflectedSubmittedAt = submittedAt;
        }
      }
    }

    // ランキングを作成
    const entries = Array.from(userScores.values());

    // スコア降順、同点時はlastReflectedSubmittedAt昇順（早い方が上位）
    entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (
        a.lastReflectedSubmittedAt.toMillis() -
        b.lastReflectedSubmittedAt.toMillis()
      );
    });

    // ランク付け
    const rankedEntries: RankingEntry[] = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // ランキングキャッシュを保存
    const docId = rankingDocId(seasonId, division);
    const rankingCache: RankingCache = {
      seasonId,
      division,
      entries: rankedEntries.slice(0, 100), // 上位100名
      totalParticipants: rankedEntries.length,
      updatedAt: Timestamp.now(),
    };

    await db.collection(COLLECTIONS.RANKINGS).doc(docId).set(rankingCache);

    console.log(
      `[updateRankingsCache] Updated ${docId}: ${rankedEntries.length} participants`
    );
  }
}

// =============================================================================
// S1_T04/T05: checkSeasonTransition
// =============================================================================

/**
 * シーズン状態遷移をチェック
 * 毎日 00:01 JST に実行
 *
 * - 終了日を過ぎたopenシーズン → frozen
 * - frozenから24時間経過 → finalized + banzukeSnapshots作成
 */
export const checkSeasonTransition = functions
  .region('asia-northeast1')
  .pubsub.schedule('1 0 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    console.log('[checkSeasonTransition] Starting...');

    try {
      // 1. open → frozen チェック
      const openSeasons = await getSeasonsByStatus('open');
      const now = new Date();

      // open → frozen は管理者が手動でトリガーするか、
      // 別途endDateフィールドを追加して自動遷移を実装
      // 現時点では自動遷移なし（ログのみ）
      if (openSeasons.length > 0) {
        console.log(
          `[checkSeasonTransition] ${openSeasons.length} open season(s) found: ${openSeasons.map((s) => s.seasonId).join(', ')}`
        );
      }

      // 2. frozen → finalized チェック
      const frozenSeasons = await getSeasonsByStatus('frozen');

      for (const season of frozenSeasons) {
        if (!season.freezeDate) continue;

        const freezeTime = season.freezeDate.toDate();
        const hoursSinceFrozen =
          (now.getTime() - freezeTime.getTime()) / (1000 * 60 * 60);

        // 24時間経過したらfinalized
        if (hoursSinceFrozen >= 24) {
          console.log(
            `[checkSeasonTransition] Finalizing ${season.seasonId} (${hoursSinceFrozen.toFixed(1)}h since frozen)`
          );

          // banzukeSnapshots を作成
          const { kyuCount, danCount } = await createBanzukeSnapshots(season.seasonId);

          // シーズンをfinalizedに遷移
          await finalizeSeason(season.seasonId);

          // 監査ログ
          await logSeasonFinalized(
            season.seasonId,
            kyuCount,
            danCount,
            'system'
          ).catch((err) => console.error('Audit log failed:', err));
        }
      }

      console.log('[checkSeasonTransition] Completed');
      return null;
    } catch (error) {
      console.error('[checkSeasonTransition] Error:', error);
      throw error;
    }
  });

/**
 * 番付スナップショットを作成（S1_T05）
 * @returns 各部門の参加者数
 */
async function createBanzukeSnapshots(
  seasonId: string
): Promise<{ kyuCount: number; danCount: number }> {
  const divisions: Division[] = ['kyu', 'dan'];
  const counts = { kyuCount: 0, danCount: 0 };

  for (const division of divisions) {
    // 現在のランキングキャッシュを取得
    const rankingDocRef = db
      .collection(COLLECTIONS.RANKINGS)
      .doc(rankingDocId(seasonId, division));
    const rankingDoc = await rankingDocRef.get();

    if (!rankingDoc.exists) {
      console.log(
        `[createBanzukeSnapshots] No ranking cache for ${seasonId}/${division}`
      );
      continue;
    }

    const rankingCache = rankingDoc.data() as RankingCache;

    // 番付エントリーを作成
    const banzukeEntries: BanzukeEntry[] = rankingCache.entries.map(
      (entry, index) => ({
        ...entry,
        // 段位の部で1位かつ参加者24名以上の場合、チャンピオンフラグ
        isChampion:
          division === 'dan' &&
          index === 0 &&
          rankingCache.totalParticipants >= TITLE_REQUIREMENTS.MIN_PARTICIPANTS,
      })
    );

    // banzukeSnapshots を作成
    const docId = banzukeDocId(seasonId, division);
    const banzukeSnapshot: BanzukeSnapshot = {
      seasonId,
      division,
      status: 'finalized',
      entries: banzukeEntries,
      totalParticipants: rankingCache.totalParticipants,
      createdAt: Timestamp.now(),
    };

    await db
      .collection(COLLECTIONS.BANZUKE_SNAPSHOTS)
      .doc(docId)
      .set(banzukeSnapshot);

    // Track participant counts
    if (division === 'kyu') {
      counts.kyuCount = rankingCache.totalParticipants;
    } else {
      counts.danCount = rankingCache.totalParticipants;
    }

    console.log(
      `[createBanzukeSnapshots] Created ${docId}: ${banzukeEntries.length} entries`
    );
  }

  return counts;
}

// =============================================================================
// S1_T06: updateTitles (finalize後に呼び出し)
// =============================================================================

/**
 * 称号を更新
 * finalizedスナップショットに基づき称号カウントを更新
 */
export const updateTitles = functions
  .region('asia-northeast1')
  .firestore.document(`${COLLECTIONS.BANZUKE_SNAPSHOTS}/{snapshotId}`)
  .onCreate(async (snap) => {
    const snapshot = snap.data() as BanzukeSnapshot;

    // 段位の部のみ対象
    if (snapshot.division !== 'dan') {
      console.log('[updateTitles] Skipping kyu division');
      return null;
    }

    // 参加者が24名未満は対象外
    if (snapshot.totalParticipants < TITLE_REQUIREMENTS.MIN_PARTICIPANTS) {
      console.log(
        `[updateTitles] Skipping: only ${snapshot.totalParticipants} participants (need ${TITLE_REQUIREMENTS.MIN_PARTICIPANTS})`
      );
      return null;
    }

    // 1位のユーザーを取得
    const champion = snapshot.entries.find((e) => e.rank === 1 && e.isChampion);
    if (!champion) {
      console.log('[updateTitles] No champion found');
      return null;
    }

    console.log(
      `[updateTitles] Processing champion: ${champion.uid} (${champion.nickname})`
    );

    // titlesドキュメントを更新
    const titleRef = db.collection(COLLECTIONS.TITLES).doc(champion.uid);

    await db.runTransaction(async (transaction) => {
      const titleDoc = await transaction.get(titleRef);

      const now = Timestamp.now();
      const newHistory = {
        seasonId: snapshot.seasonId,
        division: 'dan' as const,
        rank: 1,
        totalParticipants: snapshot.totalParticipants,
        awardedAt: now,
      };

      if (!titleDoc.exists) {
        // 新規作成
        transaction.set(titleRef, {
          uid: champion.uid,
          nickname: champion.nickname,
          meijinCount: 1,
          eiseiCount: 0,
          isMeijin: false,
          isEisei: false,
          history: [newHistory],
          updatedAt: now,
        });
      } else {
        // 既存を更新
        const title = titleDoc.data()!;
        const newMeijinCount = (title.meijinCount || 0) + 1;
        const newEiseiCount = title.eiseiCount || 0;

        transaction.update(titleRef, {
          nickname: champion.nickname,
          meijinCount: newMeijinCount,
          eiseiCount: newEiseiCount,
          isMeijin: newMeijinCount >= TITLE_REQUIREMENTS.MEIJIN_COUNT,
          isEisei: newEiseiCount >= TITLE_REQUIREMENTS.EISEI_COUNT,
          history: admin.firestore.FieldValue.arrayUnion(newHistory),
          updatedAt: now,
        });
      }
    });

    // Get updated title info for audit log
    const updatedTitleDoc = await titleRef.get();
    const updatedTitle = updatedTitleDoc.data();
    const newMeijinCount = updatedTitle?.meijinCount || 1;

    // Determine if this triggered meijin or eisei status
    const titleType = newMeijinCount >= TITLE_REQUIREMENTS.EISEI_COUNT
      ? 'eisei'
      : 'meijin';

    // 監査ログ
    await logTitleAwarded(
      champion.uid,
      snapshot.seasonId,
      titleType,
      newMeijinCount,
      snapshot.totalParticipants
    ).catch((err) => console.error('Audit log failed:', err));

    console.log(`[updateTitles] Title awarded to ${champion.nickname} (count: ${newMeijinCount})`);
    return null;
  });

// =============================================================================
// S1_T13: costGuardCleanup - メモリクリーンアップとコスト監視
// =============================================================================

/**
 * 定期クリーンアップとコスト監視
 * 毎時00分に実行
 */
export const costGuardCleanup = functions
  .region('asia-northeast1')
  .pubsub.schedule('0 * * * *') // 毎時00分
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    console.log('[costGuardCleanup] Starting...');

    try {
      // メモリキャッシュとレート制限のクリーンアップ
      const cleanupResult = runCleanup();
      console.log(
        `[costGuardCleanup] Cleaned up ${cleanupResult.cache} cache entries, ${cleanupResult.rateLimits} rate limit entries`
      );

      // コストメトリクスのログ出力
      const metrics = getCostMetrics();
      console.log(
        `[costGuardCleanup] Metrics - Reads: ${metrics.firestoreReads}, Writes: ${metrics.firestoreWrites}, Invocations: ${metrics.functionInvocations}`
      );

      return null;
    } catch (error) {
      console.error('[costGuardCleanup] Error:', error);
      throw error;
    }
  });
