/**
 * Admin service for initializing data
 * Note: This should only be used by admins/developers
 */

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';

/**
 * Initialize seasons collection with 2026 winter season
 * Calls Cloud Function to create the season (requires auth)
 */
export async function initializeSeasons(): Promise<void> {
  const adminCreateSeason = httpsCallable(functions, 'adminCreateSeason');

  try {
    const result = await adminCreateSeason({ year: 2026, term: 'winter' });
    console.log('Season created:', result.data);
  } catch (error: any) {
    // If already exists, that's fine
    if (error.code === 'functions/already-exists') {
      console.log('Season already exists');
      return;
    }
    throw error;
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
