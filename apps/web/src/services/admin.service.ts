/**
 * Admin service for initializing data
 * Note: This should only be used by admins/developers
 */

import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';

import type { SeasonStatus } from '@/types/entry';

interface SeasonData {
  seasonId: string;
  name: string;
  startDate: Date;
  freezeDate?: Date;
  finalizeDate?: Date;
  status: SeasonStatus;
}

/**
 * Initialize seasons collection with 2026 data
 * Call this once to set up the seasons
 * Status values: 'open' (active), 'frozen', 'finalized', 'archived'
 */
export async function initializeSeasons(): Promise<void> {
  const seasons: SeasonData[] = [
    {
      seasonId: '2026_winter',
      name: '2026年冬戦',
      startDate: new Date('2026-01-01T00:00:00+09:00'),
      freezeDate: new Date('2026-03-25T23:59:59+09:00'),
      finalizeDate: new Date('2026-03-31T23:59:59+09:00'),
      status: 'open',
    },
    {
      seasonId: '2026_spring',
      name: '2026年春戦',
      startDate: new Date('2026-04-01T00:00:00+09:00'),
      freezeDate: new Date('2026-06-25T23:59:59+09:00'),
      finalizeDate: new Date('2026-06-30T23:59:59+09:00'),
      status: 'archived', // Not yet started
    },
    {
      seasonId: '2026_summer',
      name: '2026年夏戦',
      startDate: new Date('2026-07-01T00:00:00+09:00'),
      freezeDate: new Date('2026-09-25T23:59:59+09:00'),
      finalizeDate: new Date('2026-09-30T23:59:59+09:00'),
      status: 'archived', // Not yet started
    },
    {
      seasonId: '2026_autumn',
      name: '2026年秋戦',
      startDate: new Date('2026-10-01T00:00:00+09:00'),
      freezeDate: new Date('2026-12-25T23:59:59+09:00'),
      finalizeDate: new Date('2026-12-31T23:59:59+09:00'),
      status: 'archived', // Not yet started
    },
  ];

  const now = Timestamp.now();

  for (const season of seasons) {
    const docRef = doc(db, 'seasons', season.seasonId);
    await setDoc(docRef, {
      seasonId: season.seasonId,
      name: season.name,
      startDate: Timestamp.fromDate(season.startDate),
      freezeDate: season.freezeDate ? Timestamp.fromDate(season.freezeDate) : null,
      finalizeDate: season.finalizeDate ? Timestamp.fromDate(season.finalizeDate) : null,
      status: season.status,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created season: ${season.name} (${season.status})`);
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
