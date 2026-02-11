/**
 * 102: 季末確定パイプライン (freeze → finalize → publish)
 * 冪等な状態機械ベース
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  SeasonSnapshot,
  SnapshotRankingEntry,
  JobRun,
  JobName,
  UTAAWASE_COLLECTIONS,
} from '../types/utaawase';
import { getSeasonEvents } from './eventService';
import { getRuleset } from './rulesetService';
import { runPromotions } from './promotionService';

const db = admin.firestore();

// =============================================================================
// Job Run logging
// =============================================================================

async function createJobRun(jobName: JobName, seasonKey: string, createdBy: string): Promise<string> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.JOB_RUNS).doc();
  const jobRun: JobRun = {
    runId: ref.id,
    jobName,
    seasonKey,
    status: 'running',
    startedAt: FieldValue.serverTimestamp() as Timestamp,
    createdBy,
  };
  await ref.set(jobRun);
  return ref.id;
}

async function completeJobRun(runId: string, status: 'success' | 'failed', error?: string, stats?: Record<string, number>): Promise<void> {
  await db.collection(UTAAWASE_COLLECTIONS.JOB_RUNS).doc(runId).update({
    status,
    completedAt: FieldValue.serverTimestamp(),
    ...(error ? { error } : {}),
    ...(stats ? { stats } : {}),
  });
}

export async function getJobRuns(seasonKey: string): Promise<JobRun[]> {
  const snapshot = await db.collection(UTAAWASE_COLLECTIONS.JOB_RUNS)
    .where('seasonKey', '==', seasonKey)
    .orderBy('startedAt', 'desc')
    .limit(20)
    .get();
  return snapshot.docs.map((doc) => doc.data() as JobRun);
}

// =============================================================================
// Snapshot CRUD
// =============================================================================

async function getOrCreateSnapshot(seasonKey: string): Promise<SeasonSnapshot> {
  const ref = db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
  const doc = await ref.get();

  if (doc.exists) {
    return doc.data() as SeasonSnapshot;
  }

  const [yearStr, seasonId] = seasonKey.split('_');
  const year = parseInt(yearStr, 10);

  const initial: SeasonSnapshot = {
    snapshotId: seasonKey,
    year,
    seasonId: seasonId as any,
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
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await ref.set(initial);
  return initial;
}

// =============================================================================
// Freeze
// =============================================================================

export async function freezeSeason(seasonKey: string, triggeredBy: string): Promise<void> {
  const runId = await createJobRun('freeze', seasonKey, triggeredBy);

  try {
    const snapshot = await getOrCreateSnapshot(seasonKey);

    // Idempotency: skip if already frozen or beyond
    if (snapshot.pipeline.status !== 'draft') {
      await completeJobRun(runId, 'success', undefined, { skipped: 1 });
      return;
    }

    // Gather all match events for this season
    const events = await getSeasonEvents(seasonKey, 'match');

    // Build best-3 rankings from events
    const scoreMap = new Map<string, { uid: string; nickname: string; scores: number[]; count: number }>();
    for (const event of events) {
      if (event.matchData) {
        const existing = scoreMap.get(event.uid) || { uid: event.uid, nickname: '', scores: [], count: 0 };
        existing.scores.push(event.matchData.score);
        existing.count += 1;
        scoreMap.set(event.uid, existing);
      }
    }

    // Get nicknames and compute best-3 totals
    for (const [uid, entry] of scoreMap) {
      const userDoc = await db.collection('users').doc(uid).get();
      entry.nickname = userDoc.exists ? userDoc.data()?.nickname || 'Anonymous' : 'Anonymous';
    }

    // Sort by best-3 total descending and assign ranks
    const withTotals = Array.from(scoreMap.values()).map((e) => {
      const bestThree = e.scores.sort((a, b) => b - a).slice(0, 3);
      return { ...e, bestThreeTotal: bestThree.reduce((sum, s) => sum + s, 0) };
    });
    const sorted = withTotals.sort((a, b) => b.bestThreeTotal - a.bestThreeTotal);
    const rankings: SnapshotRankingEntry[] = [];
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].bestThreeTotal < sorted[i - 1].bestThreeTotal) {
        currentRank = i + 1;
      }
      rankings.push({
        uid: sorted[i].uid,
        nickname: sorted[i].nickname,
        rank: currentRank,
        bestThreeTotal: sorted[i].bestThreeTotal,
        matchCount: sorted[i].count,
      });
    }

    // Get current ruleset version
    const ruleset = await getRuleset();
    const rulesetVersion = ruleset?.version || 'unknown';

    // Update snapshot
    const ref = db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
    await ref.update({
      'pipeline.status': 'frozen',
      'pipeline.frozenAt': FieldValue.serverTimestamp(),
      'pipeline.rulesetVersion': rulesetVersion,
      rankings,
      totalParticipants: rankings.length,
      totalEvents: events.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await completeJobRun(runId, 'success', undefined, {
      participants: rankings.length,
      events: events.length,
    });
  } catch (error: any) {
    await completeJobRun(runId, 'failed', error.message);
    throw error;
  }
}

// =============================================================================
// Finalize
// =============================================================================

export async function finalizeSeason(seasonKey: string, triggeredBy: string): Promise<void> {
  const runId = await createJobRun('finalize', seasonKey, triggeredBy);

  try {
    const ref = db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new Error(`Snapshot not found: ${seasonKey}`);
    }

    const snapshot = doc.data() as SeasonSnapshot;

    // Idempotency
    if (snapshot.pipeline.status === 'finalized' || snapshot.pipeline.status === 'published') {
      await completeJobRun(runId, 'success', undefined, { skipped: 1 });
      return;
    }

    if (snapshot.pipeline.status !== 'frozen') {
      throw new Error(`Cannot finalize: status is ${snapshot.pipeline.status}, expected frozen`);
    }

    // Run promotions (dan, den, utakurai)
    const promotions = await runPromotions(snapshot);

    await ref.update({
      'pipeline.status': 'finalized',
      'pipeline.finalizedAt': FieldValue.serverTimestamp(),
      promotions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await completeJobRun(runId, 'success', undefined, {
      promotions: promotions.length,
    });
  } catch (error: any) {
    await completeJobRun(runId, 'failed', error.message);
    throw error;
  }
}

// =============================================================================
// Publish
// =============================================================================

export async function publishSeason(seasonKey: string, triggeredBy: string): Promise<void> {
  const runId = await createJobRun('publish', seasonKey, triggeredBy);

  try {
    const ref = db.collection(UTAAWASE_COLLECTIONS.SEASON_SNAPSHOTS).doc(seasonKey);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new Error(`Snapshot not found: ${seasonKey}`);
    }

    const snapshot = doc.data() as SeasonSnapshot;

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
      'pipeline.publishedAt': FieldValue.serverTimestamp(),
      immutable: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await completeJobRun(runId, 'success');
  } catch (error: any) {
    await completeJobRun(runId, 'failed', error.message);
    throw error;
  }
}
