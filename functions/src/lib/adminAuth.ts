/**
 * 106: 権限チェック共通ユーティリティ
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export type SiteRole = 'admin' | 'tester' | 'user' | 'banned';

const VALID_SITE_ROLES: SiteRole[] = ['admin', 'tester', 'user', 'banned'];

const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];

/**
 * Firestore から siteRole を取得（未設定は 'user'）
 */
export async function getSiteRole(uid: string): Promise<SiteRole> {
  const db = admin.firestore();
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return 'user';
  const role = doc.data()?.siteRole;
  if (role && VALID_SITE_ROLES.includes(role)) return role;
  return 'user';
}

/**
 * uid が admin かどうか判定
 * - エミュレータ環境: 常に true
 * - ADMIN_UIDS 環境変数: 移行期間互換
 * - Firestore siteRole: 正式判定
 */
export async function isAdmin(uid: string): Promise<boolean> {
  if (process.env.FUNCTIONS_EMULATOR) return true;
  if (ADMIN_UIDS.includes(uid)) return true;
  return (await getSiteRole(uid)) === 'admin';
}

/**
 * 認証チェック — uid を返す
 */
export function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  return context.auth.uid;
}

/**
 * 管理者チェック — uid を返す
 */
export async function requireAdmin(context: functions.https.CallableContext): Promise<string> {
  const uid = requireAuth(context);
  if (!(await isAdmin(uid))) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  return uid;
}

export function isValidSiteRole(role: string): role is SiteRole {
  return VALID_SITE_ROLES.includes(role as SiteRole);
}
