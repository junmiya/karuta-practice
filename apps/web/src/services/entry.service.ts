/**
 * Entry service for managing season entries
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Entry, Division, SeasonLegacy } from '@/types/entry';

const ENTRIES_COLLECTION = 'entries';
const SEASONS_COLLECTION = 'seasons';

/**
 * Get active season (legacy - Stage 0)
 */
export async function getActiveSeason(): Promise<SeasonLegacy | null> {
  const seasonsRef = collection(db, SEASONS_COLLECTION);
  const q = query(seasonsRef, where('status', '==', 'active'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    seasonId: data.seasonId,
    name: data.name,
    startDate: data.startDate?.toDate() || new Date(),
    endDate: data.endDate?.toDate() || new Date(),
    status: data.status,
  };
}

/**
 * Get user's entry for a season
 */
export async function getUserEntry(
  uid: string,
  seasonId: string
): Promise<Entry | null> {
  const entryId = `${uid}_${seasonId}`;
  const entryRef = doc(db, ENTRIES_COLLECTION, entryId);
  const entryDoc = await getDoc(entryRef);

  if (!entryDoc.exists()) {
    return null;
  }

  const data = entryDoc.data();
  return {
    uid: data.uid,
    seasonId: data.seasonId,
    division: data.division as Division,
    consentAt: data.consentAt?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

/**
 * Create a new entry for a season
 */
export async function createEntry(
  uid: string,
  seasonId: string,
  division: Division
): Promise<Entry> {
  const entryId = `${uid}_${seasonId}`;
  const entryRef = doc(db, ENTRIES_COLLECTION, entryId);

  // Check if entry already exists
  const existingEntry = await getDoc(entryRef);
  if (existingEntry.exists()) {
    throw new Error('既にこのシーズンにエントリー済みです');
  }

  const entry = {
    uid,
    seasonId,
    division,
    consentAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(entryRef, entry);

  return {
    uid,
    seasonId,
    division,
    consentAt: new Date(),
    createdAt: new Date(),
  };
}

/**
 * Check if user can enter dan division (requires 6-kyu or higher)
 */
export async function canEnterDanDivision(uid: string): Promise<boolean> {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return false;
  }

  const rank = userDoc.data()?.rank;
  // For now, allow if rank exists and is not empty
  // In production, implement proper rank validation
  return Boolean(rank);
}
