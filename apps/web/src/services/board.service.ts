/**
 * 108: 便り（掲示板）機能 - Firestore直接アクセス（Cloud Functions不使用）
 */
import {
  collection, doc, addDoc, deleteDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { BoardPost, BoardComment, PostType, BugStatus, BugTargetArea, BugFrequency } from '@/types/board';

const postsRef = collection(db, 'board_posts');
const commentsRef = collection(db, 'board_comments');

function toDate(v: any): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string') return new Date(v);
  return new Date();
}

function docToPost(doc: any): BoardPost {
  const d = doc.data();
  return {
    id: doc.id,
    ...d,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    expiresAt: d.expiresAt ? toDate(d.expiresAt) : undefined,
  };
}

function docToComment(doc: any): BoardComment {
  const d = doc.data();
  return {
    id: doc.id,
    ...d,
    createdAt: toDate(d.createdAt),
  };
}

// === 瓦版 ===

export async function getKawarabanPosts(): Promise<BoardPost[]> {
  const q = query(
    postsRef,
    where('category', '==', 'kawaraban'),
    orderBy('pinned', 'desc'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map(docToPost)
    .filter(p => !p.expiresAt || p.expiresAt > now);
}

export async function createKawarabanPost(params: {
  type: PostType;
  title: string;
  body?: string;
  externalUrl?: string;
  pinned?: boolean;
  createdByUserId: string;
  createdByNickname: string;
}): Promise<{ postId: string }> {
  const now = serverTimestamp();
  const ref = await addDoc(postsRef, {
    category: 'kawaraban',
    type: params.type,
    title: params.title,
    body: params.body || '',
    externalUrl: params.externalUrl || null,
    pinned: params.pinned || false,
    createdByUserId: params.createdByUserId,
    createdByNickname: params.createdByNickname,
    createdAt: now,
    updatedAt: now,
  });
  return { postId: ref.id };
}

export async function deleteBoardPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'board_posts', postId));
}

// === 不具合の部屋 ===

export async function getBugPosts(filters?: {
  status?: BugStatus;
  targetArea?: BugTargetArea;
}): Promise<BoardPost[]> {
  const constraints: any[] = [
    where('category', '==', 'bugroom'),
    orderBy('createdAt', 'desc'),
  ];
  // Firestoreの複合クエリ制約があるため、フィルタはクライアント側で適用
  const q = query(postsRef, ...constraints);
  const snap = await getDocs(q);
  let posts = snap.docs.map(docToPost);
  if (filters?.status) posts = posts.filter(p => p.status === filters.status);
  if (filters?.targetArea) posts = posts.filter(p => p.targetArea === filters.targetArea);
  return posts;
}

export async function createBugReport(params: {
  title: string;
  targetArea: BugTargetArea;
  targetPage?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  envOs?: string;
  envBrowser?: string;
  envDevice?: string;
  frequency?: BugFrequency;
  createdByUserId: string;
  createdByNickname: string;
}): Promise<{ postId: string }> {
  const now = serverTimestamp();
  const ref = await addDoc(postsRef, {
    category: 'bugroom',
    type: 'bug_report',
    title: params.title,
    status: 'new' as BugStatus,
    targetArea: params.targetArea,
    targetPage: params.targetPage || null,
    steps: params.steps || null,
    expected: params.expected || null,
    actual: params.actual || null,
    envOs: params.envOs || null,
    envBrowser: params.envBrowser || null,
    envDevice: params.envDevice || null,
    frequency: params.frequency || null,
    createdByUserId: params.createdByUserId,
    createdByNickname: params.createdByNickname,
    createdAt: now,
    updatedAt: now,
  });
  return { postId: ref.id };
}

export async function updateBugStatus(postId: string, status: BugStatus): Promise<void> {
  await updateDoc(doc(db, 'board_posts', postId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// === コメント ===

export async function getComments(postId: string): Promise<BoardComment[]> {
  const q = query(
    commentsRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(docToComment);
}

export async function addComment(params: {
  postId: string;
  body: string;
  createdByUserId: string;
  createdByNickname: string;
}): Promise<{ commentId: string }> {
  const ref = await addDoc(commentsRef, {
    postId: params.postId,
    body: params.body,
    createdByUserId: params.createdByUserId,
    createdByNickname: params.createdByNickname,
    createdAt: serverTimestamp(),
  });
  return { commentId: ref.id };
}
