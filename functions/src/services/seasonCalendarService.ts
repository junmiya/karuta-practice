/**
 * 102: 節気カレンダー Firestore CRUD
 * Document: season_calendars/{year}
 */
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { SeasonCalendar, SeasonPeriod, SekkiBoundary, UTAAWASE_COLLECTIONS } from '../types/utaawase';
import { validateSeasonCalendar } from '../lib/ruleEngine';

const db = admin.firestore();

export async function getSeasonCalendar(year: number): Promise<SeasonCalendar | null> {
  const doc = await db.collection(UTAAWASE_COLLECTIONS.SEASON_CALENDARS).doc(String(year)).get();
  if (!doc.exists) return null;
  return doc.data() as SeasonCalendar;
}

export async function saveSeasonCalendar(calendar: Omit<SeasonCalendar, 'createdAt' | 'updatedAt'>): Promise<SeasonCalendar> {
  const errors = validateSeasonCalendar(calendar);
  if (errors.length > 0) {
    throw new Error(`Invalid calendar: ${errors.join(', ')}`);
  }

  const ref = db.collection(UTAAWASE_COLLECTIONS.SEASON_CALENDARS).doc(String(calendar.year));
  const existing = await ref.get();

  const data = {
    ...calendar,
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  await ref.set(data, { merge: true });

  const saved = await ref.get();
  return saved.data() as SeasonCalendar;
}

/**
 * 現在日時に対応するカレンダーと四季区分を取得
 */
export async function getCurrentSeasonInfo(now: Date): Promise<{
  calendar: SeasonCalendar;
  seasonId: string;
  seasonYear: number;
  seasonKey: string;
} | null> {
  const year = now.getFullYear();

  // Try current year calendar, then previous year (for winter spanning years)
  for (const y of [year, year - 1]) {
    const calendar = await getSeasonCalendar(y);
    if (!calendar) continue;

    const nowMs = now.getTime();
    for (const period of calendar.periods) {
      const startMs = period.start_at.toMillis();
      const endMs = period.end_at.toMillis();
      if (nowMs >= startMs && nowMs < endMs) {
        return {
          calendar,
          seasonId: period.seasonId,
          seasonYear: y,
          seasonKey: `${y}_${period.seasonId}`,
        };
      }
    }
  }

  return null;
}

/**
 * 2026年のデフォルト節気カレンダーを生成
 * 実際の天文データに基づく近似値
 */
export function generate2026DefaultCalendar(): Omit<SeasonCalendar, 'createdAt' | 'updatedAt'> {
  const toTs = (dateStr: string) => Timestamp.fromDate(new Date(dateStr));

  const boundaries: SekkiBoundary[] = [
    { marker: 'risshun', datetime: toTs('2026-02-04T00:00:00+09:00') },
    { marker: 'rikka', datetime: toTs('2026-05-05T00:00:00+09:00') },
    { marker: 'risshuu', datetime: toTs('2026-08-07T00:00:00+09:00') },
    { marker: 'rittou', datetime: toTs('2026-11-07T00:00:00+09:00') },
    { marker: 'risshun_next', datetime: toTs('2027-02-03T00:00:00+09:00') },
  ];

  const periods: SeasonPeriod[] = [
    { seasonId: 'spring', label: '春戦', start_at: toTs('2026-02-04T00:00:00+09:00'), end_at: toTs('2026-05-05T00:00:00+09:00') },
    { seasonId: 'summer', label: '夏戦', start_at: toTs('2026-05-05T00:00:00+09:00'), end_at: toTs('2026-08-07T00:00:00+09:00') },
    { seasonId: 'autumn', label: '秋戦', start_at: toTs('2026-08-07T00:00:00+09:00'), end_at: toTs('2026-11-07T00:00:00+09:00') },
    { seasonId: 'winter', label: '冬戦', start_at: toTs('2026-11-07T00:00:00+09:00'), end_at: toTs('2027-02-03T00:00:00+09:00') },
  ];

  return { year: 2026, boundaries, periods };
}
