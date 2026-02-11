/**
 * 103: 団体機能 - 団体成績集計サービス
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { GroupStatsDoc, GROUP_COLLECTIONS } from '../types/group';

const db = admin.firestore();

/**
 * 団体の成績を更新
 * 試合確定時に呼び出される
 */
export async function updateGroupStats(params: {
  groupId: string;
  groupName: string;
  seasonKey: string;
  score: number;
}): Promise<void> {
  const { groupId, seasonKey, score } = params;

  const statsId = `${groupId}_${seasonKey}`;
  const statsRef = db.collection(GROUP_COLLECTIONS.STATS).doc(statsId);

  const statsDoc = await statsRef.get();

  if (!statsDoc.exists) {
    // 新規作成
    const newStats: GroupStatsDoc = {
      statsId,
      groupId,
      seasonKey,
      totalMatches: 1,
      totalScore: score,
      avgScore: score,
      topScore: score,
      memberCount: 0, // 後で更新
      updatedAt: Timestamp.now(),
    };
    await statsRef.set(newStats);
  } else {
    // 既存を更新
    const current = statsDoc.data() as GroupStatsDoc;
    const newTotalMatches = current.totalMatches + 1;
    const newTotalScore = current.totalScore + score;
    const newAvgScore = Math.round(newTotalScore / newTotalMatches);
    const newTopScore = Math.max(current.topScore, score);

    await statsRef.update({
      totalMatches: newTotalMatches,
      totalScore: newTotalScore,
      avgScore: newAvgScore,
      topScore: newTopScore,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * 団体成績を取得
 */
export async function getGroupStats(
  groupId: string,
  seasonKey: string
): Promise<GroupStatsDoc | null> {
  const statsId = `${groupId}_${seasonKey}`;
  const doc = await db.collection(GROUP_COLLECTIONS.STATS).doc(statsId).get();

  if (!doc.exists) return null;
  return doc.data() as GroupStatsDoc;
}

/**
 * シーズンの団体ランキングを取得
 */
export async function getSeasonGroupRanking(
  seasonKey: string,
  limit: number = 50
): Promise<(GroupStatsDoc & { groupName: string })[]> {
  const snap = await db
    .collection(GROUP_COLLECTIONS.STATS)
    .where('seasonKey', '==', seasonKey)
    .orderBy('avgScore', 'desc')
    .limit(limit)
    .get();

  const results: (GroupStatsDoc & { groupName: string })[] = [];

  for (const doc of snap.docs) {
    const stats = doc.data() as GroupStatsDoc;

    // 団体名を取得
    const groupDoc = await db.collection(GROUP_COLLECTIONS.GROUPS).doc(stats.groupId).get();
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
export async function syncGroupMemberCount(groupId: string): Promise<void> {
  // 現在のアクティブメンバー数を取得
  const membersSnap = await db
    .collection(GROUP_COLLECTIONS.MEMBERSHIPS)
    .where('groupId', '==', groupId)
    .where('status', '==', 'active')
    .count()
    .get();

  const memberCount = membersSnap.data().count;

  // 全シーズンの成績を更新
  const statsSnap = await db
    .collection(GROUP_COLLECTIONS.STATS)
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
export async function aggregateAllGroupStats(seasonKey: string): Promise<{
  processed: number;
  errors: number;
}> {
  let processed = 0;
  let errors = 0;

  // 全団体を取得
  const groupsSnap = await db
    .collection(GROUP_COLLECTIONS.GROUPS)
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

      if (sessionsSnap.empty) continue;

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
        .collection(GROUP_COLLECTIONS.MEMBERSHIPS)
        .where('groupId', '==', groupId)
        .where('status', '==', 'active')
        .count()
        .get();

      const memberCount = membersSnap.data().count;

      // 成績ドキュメントを更新/作成
      const statsId = `${groupId}_${seasonKey}`;
      const statsDoc: GroupStatsDoc = {
        statsId,
        groupId,
        seasonKey,
        totalMatches: count,
        totalScore,
        avgScore,
        topScore,
        memberCount,
        updatedAt: Timestamp.now(),
      };

      await db.collection(GROUP_COLLECTIONS.STATS).doc(statsId).set(statsDoc);
      processed++;
    } catch (err) {
      console.error(`Error aggregating stats for group ${groupDoc.id}:`, err);
      errors++;
    }
  }

  return { processed, errors };
}
