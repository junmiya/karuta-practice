/**
 * 102: 歌合イベント Firestore CRUD
 * Collection: events/{eventId}
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  UtaawaseEvent,
  EventType,
  SeasonId,
  MatchEventData,
  KyuiExamEventData,
  UTAAWASE_COLLECTIONS,
} from '../types/utaawase';
import { determineTier } from '../lib/ruleEngine';
import { getSeasonCalendar } from './seasonCalendarService';
import { getRuleset } from './rulesetService';

const db = admin.firestore();

export interface CreateMatchEventInput {
  uid: string;
  sessionId: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
  participantCount: number;
  startedAt: Date;
}

/**
 * 公式競技セッション確定時にmatchイベントを自動生成
 */
export async function createMatchEvent(input: CreateMatchEventInput): Promise<UtaawaseEvent | null> {
  const { uid, sessionId, score, correctCount, totalElapsedMs, allCards, participantCount, startedAt } = input;

  // Determine season from calendar
  const year = startedAt.getFullYear();
  // Try current year, then previous year (winter spanning)
  let seasonInfo: { seasonId: SeasonId; seasonYear: number } | null = null;
  for (const y of [year, year - 1]) {
    const calendar = await getSeasonCalendar(y);
    if (calendar) {
      const { determineSeason: ds } = await import('../lib/ruleEngine');
      seasonInfo = ds(calendar, startedAt);
      if (seasonInfo) break;
    }
  }

  if (!seasonInfo) {
    console.warn(`No season calendar found for event at ${startedAt.toISOString()}`);
    return null;
  }

  // Determine tier
  const ruleset = await getRuleset();
  const officialMin = ruleset?.officialMinParticipants || 24;
  const tier = determineTier(participantCount, officialMin);

  const seasonKey = `${seasonInfo.seasonYear}_${seasonInfo.seasonId}`;
  const eventRef = db.collection(UTAAWASE_COLLECTIONS.EVENTS).doc();

  const matchData: MatchEventData = {
    sessionId,
    score,
    correctCount,
    totalElapsedMs,
    allCards,
  };

  const event: Omit<UtaawaseEvent, 'eventId'> & { eventId: string } = {
    eventId: eventRef.id,
    uid,
    eventType: 'match',
    seasonId: seasonInfo.seasonId,
    seasonYear: seasonInfo.seasonYear,
    seasonKey,
    tier,
    participantCount,
    matchData,
    startedAt: Timestamp.fromDate(startedAt),
    createdAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await eventRef.set(event);
  return event;
}

export interface CreateKyuiExamEventInput {
  uid: string;
  kimarijiFuda: number | null;
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  allCards: boolean;
  passed: boolean;
  startedAt: Date;
}

/**
 * 級位検定イベントを記録
 */
export async function createKyuiExamEvent(input: CreateKyuiExamEventInput): Promise<UtaawaseEvent | null> {
  const { uid, kimarijiFuda, questionCount, correctCount, totalElapsedMs, allCards, passed, startedAt } = input;

  // Determine season
  const year = startedAt.getFullYear();
  let seasonInfo: { seasonId: SeasonId; seasonYear: number } | null = null;
  for (const y of [year, year - 1]) {
    const calendar = await getSeasonCalendar(y);
    if (calendar) {
      const { determineSeason: ds } = await import('../lib/ruleEngine');
      seasonInfo = ds(calendar, startedAt);
      if (seasonInfo) break;
    }
  }

  if (!seasonInfo) {
    console.warn(`No season calendar found for exam at ${startedAt.toISOString()}`);
    return null;
  }

  const seasonKey = `${seasonInfo.seasonYear}_${seasonInfo.seasonId}`;
  const eventRef = db.collection(UTAAWASE_COLLECTIONS.EVENTS).doc();

  const passRate = questionCount > 0 ? (correctCount / questionCount) * 100 : 0;

  const examData: KyuiExamEventData = {
    kimarijiFuda,
    questionCount,
    correctCount,
    totalElapsedMs,
    allCards,
    passRate,
    passed,
  };

  const event: UtaawaseEvent = {
    eventId: eventRef.id,
    uid,
    eventType: 'kyui_exam',
    seasonId: seasonInfo.seasonId,
    seasonYear: seasonInfo.seasonYear,
    seasonKey,
    tier: null, // exams have no tier
    participantCount: null,
    examData,
    startedAt: Timestamp.fromDate(startedAt),
    createdAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await eventRef.set(event);
  return event;
}

/**
 * シーズンのイベント一覧を取得
 */
export async function getSeasonEvents(seasonKey: string, eventType?: EventType): Promise<UtaawaseEvent[]> {
  let q = db.collection(UTAAWASE_COLLECTIONS.EVENTS)
    .where('seasonKey', '==', seasonKey) as FirebaseFirestore.Query;

  if (eventType) {
    q = q.where('eventType', '==', eventType);
  }

  const snapshot = await q.get();
  return snapshot.docs.map((doc) => doc.data() as UtaawaseEvent);
}

/**
 * ユーザーのシーズンイベントを取得
 */
export async function getUserSeasonEvents(uid: string, seasonKey: string): Promise<UtaawaseEvent[]> {
  const snapshot = await db.collection(UTAAWASE_COLLECTIONS.EVENTS)
    .where('uid', '==', uid)
    .where('seasonKey', '==', seasonKey)
    .get();

  return snapshot.docs.map((doc) => doc.data() as UtaawaseEvent);
}
