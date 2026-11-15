import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';

const USER_LEARNED_COLLECTION = 'userLearned';

export interface UserLearned {
  uid: string;
  poemIds: string[];
  /** 「覚えてない」を押した札 */
  notLearnedPoemIds: string[];
  /** 星を付けた札 */
  starredPoemIds: string[];
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
    notLearnedPoemIds: data.notLearnedPoemIds || [],
    starredPoemIds: data.starredPoemIds || [],
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export type PoemStatus = 'learned' | 'notLearned';

/**
 * 1首の状態を「覚えた」または「覚えてない」にする（もう一方からは外す）。
 * arrayUnion / arrayRemove で書くので読み込み不要で、他のフィールドも消さない。
 */
export async function setPoemStatus(
  uid: string,
  poemId: string,
  status: PoemStatus
): Promise<void> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  await setDoc(
    docRef,
    {
      poemIds: status === 'learned' ? arrayUnion(poemId) : arrayRemove(poemId),
      notLearnedPoemIds: status === 'notLearned' ? arrayUnion(poemId) : arrayRemove(poemId),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** 星を付ける / 外す（覚えた・覚えてない の記録とは別） */
export async function setPoemStarred(
  uid: string,
  poemId: string,
  starred: boolean
): Promise<void> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  await setDoc(
    docRef,
    {
      starredPoemIds: starred ? arrayUnion(poemId) : arrayRemove(poemId),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
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
  }, { merge: true });
}

/**
 * Clear all learned poems（覚えた・覚えてない の印をすべて外す。星はそのまま）
 */
export async function clearLearnedPoems(uid: string): Promise<void> {
  const docRef = doc(db, USER_LEARNED_COLLECTION, uid);
  await setDoc(docRef, {
    poemIds: [],
    notLearnedPoemIds: [],
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
