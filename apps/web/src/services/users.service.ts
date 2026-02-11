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
const CACHE_KEY_PREFIX = 'auth_profile_';

/**
 * localStorage からキャッシュ済みプロファイルを同期的に取得
 */
export function getCachedUserProfile(uid: string): User | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${uid}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      ...data,
      siteRole: data.siteRole || undefined,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  } catch {
    return null;
  }
}

function cacheUserProfile(profile: User): void {
  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${profile.uid}`,
      JSON.stringify(profile),
    );
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function clearCachedUserProfile(uid: string): void {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${uid}`);
  } catch {
    // ignore
  }
}

/**
 * Get user profile from Firestore (+ キャッシュ更新)
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  const profile: User = {
    uid,
    nickname: data.nickname || '',
    banzukeConsent: data.banzukeConsent || false,
    siteRole: data.siteRole || undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
  cacheUserProfile(profile);
  return profile;
}

/**
 * Create new user profile in Firestore and return it
 */
export async function createUserProfile(uid: string): Promise<User> {
  const now = new Date();
  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, {
    nickname: '',
    banzukeConsent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const profile: User = {
    uid,
    nickname: '',
    banzukeConsent: false,
    createdAt: now,
    updatedAt: now,
  };
  cacheUserProfile(profile);
  return profile;
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
