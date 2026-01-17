import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '@/types/user';

const USERS_COLLECTION = 'users';

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    uid,
    nickname: data.nickname || '',
    banzukeConsent: data.banzukeConsent || false,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Create new user profile in Firestore
 */
export async function createUserProfile(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, {
    nickname: '',
    banzukeConsent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
  uid: string,
  data: { nickname?: string; banzukeConsent?: boolean }
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if user profile is complete (has nickname and consent)
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false;
  return user.nickname.trim().length > 0 && user.banzukeConsent === true;
}
