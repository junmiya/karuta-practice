/**
 * Admin service for initializing data
 * Note: This should only be used by admins/developers
 */

import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface SeasonData {
  seasonId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'ended';
}

/**
 * Initialize seasons collection with 2026 data
 * Call this once to set up the seasons
 */
export async function initializeSeasons(): Promise<void> {
  const seasons: SeasonData[] = [
    {
      seasonId: '2026_winter',
      name: '2026年冬場所',
      startDate: new Date('2026-01-01T00:00:00+09:00'),
      endDate: new Date('2026-03-31T23:59:59+09:00'),
      status: 'active',
    },
    {
      seasonId: '2026_spring',
      name: '2026年春場所',
      startDate: new Date('2026-04-01T00:00:00+09:00'),
      endDate: new Date('2026-06-30T23:59:59+09:00'),
      status: 'upcoming',
    },
    {
      seasonId: '2026_summer',
      name: '2026年夏場所',
      startDate: new Date('2026-07-01T00:00:00+09:00'),
      endDate: new Date('2026-09-30T23:59:59+09:00'),
      status: 'upcoming',
    },
    {
      seasonId: '2026_autumn',
      name: '2026年秋場所',
      startDate: new Date('2026-10-01T00:00:00+09:00'),
      endDate: new Date('2026-12-31T23:59:59+09:00'),
      status: 'upcoming',
    },
  ];

  for (const season of seasons) {
    const docRef = doc(db, 'seasons', season.seasonId);
    await setDoc(docRef, {
      seasonId: season.seasonId,
      name: season.name,
      startDate: Timestamp.fromDate(season.startDate),
      endDate: Timestamp.fromDate(season.endDate),
      status: season.status,
    });
    console.log(`Created season: ${season.name}`);
  }
}

/**
 * Check if seasons are initialized
 */
export async function areSeasonsInitialized(): Promise<boolean> {
  const docRef = doc(db, 'seasons', '2026_winter');
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}
