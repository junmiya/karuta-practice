import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const USER_LEARNED_COLLECTION = 'userLearned';

export interface UserLearned {
  uid: string;
  poemIds: string[];
  updatedAt: Date;
}

/**
 * Get learned poems for a user from Firestore
 */
export async function getUserLearned(uid: string): Promise<UserLearned | null> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid,
    poemIds: data.poemIds || [],
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Toggle a poem's learned status
 * Returns the new learned state (true if now learned, false if removed)
 */
export async function toggleLearnedPoem(
  uid: string,
  poemId: string
): Promise<boolean> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  let currentPoemIds: string[] = [];
  if (docSnap.exists()) {
    currentPoemIds = docSnap.data().poemIds || [];
  }

  const isCurrentlyLearned = currentPoemIds.includes(poemId);
  const newPoemIds = isCurrentlyLearned
    ? currentPoemIds.filter(id => id !== poemId)
    : [...currentPoemIds, poemId].sort();

  await setDoc(docRef, {
    poemIds: newPoemIds,
    updatedAt: serverTimestamp(),
  });

  return !isCurrentlyLearned;
}

/**
 * Set multiple poems as learned
 */
export async function setLearnedPoems(
  uid: string,
  poemIds: string[]
): Promise<void> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  await setDoc(docRef, {
    poemIds: [...poemIds].sort(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Clear all learned poems
 */
export async function clearLearnedPoems(uid: string): Promise<void> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  await setDoc(docRef, {
    poemIds: [],
    updatedAt: serverTimestamp(),
  });
}
