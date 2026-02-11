/**
 * 102: 歌合・節気別歌位確定 - Admin V2 service (callable functions)
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Ruleset
export async function adminGetRuleset() {
  const fn = httpsCallable(functions, 'adminGetRuleset');
  const result = await fn();
  return result.data as { success: boolean; ruleset: any };
}

export async function adminSaveRuleset(ruleset: any) {
  const fn = httpsCallable(functions, 'adminSaveRuleset');
  const result = await fn({ ruleset });
  return result.data as { success: boolean; ruleset: any };
}

export async function adminSeedDefaultRuleset() {
  const fn = httpsCallable(functions, 'adminSeedDefaultRuleset');
  const result = await fn();
  return result.data as { success: boolean; ruleset: any };
}

// Season Calendar
export async function adminGetSeasonCalendar(year: number) {
  const fn = httpsCallable(functions, 'adminGetSeasonCalendar');
  const result = await fn({ year });
  return result.data as { success: boolean; calendar: any };
}

export async function adminSaveSeasonCalendar(calendar: any) {
  const fn = httpsCallable(functions, 'adminSaveSeasonCalendar');
  const result = await fn({ calendar });
  return result.data as { success: boolean; calendar: any };
}

export async function adminSeedDefaultCalendar() {
  const fn = httpsCallable(functions, 'adminSeedDefaultCalendar');
  const result = await fn();
  return result.data as { success: boolean; calendar: any };
}

// Pipeline controls (M3)
export async function adminFreezeSeason2(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminFreezeSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminFinalizeSeason2(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminFinalizeSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminPublishSeason(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminPublishSeasonV2');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean };
}

export async function adminGetJobRuns(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminGetJobRuns');
  const result = await fn({ seasonKey });
  return result.data as { success: boolean; jobRuns: any[] };
}

// 現在シーズン情報を取得
export async function adminGetCurrentSeasonInfo() {
  const fn = httpsCallable(functions, 'adminGetCurrentSeasonInfo');
  const result = await fn();
  return result.data as {
    success: boolean;
    currentSeason: { seasonKey: string; seasonId: string; year: number } | null;
    previousSeason: { seasonKey: string; seasonId: string; year: number } | null;
  };
}

// スナップショット状態を取得
export async function adminGetSnapshotStatus(seasonKey: string) {
  const fn = httpsCallable(functions, 'adminGetSnapshotStatus');
  const result = await fn({ seasonKey });
  return result.data as {
    success: boolean;
    exists: boolean;
    status: string;
    frozenAt: string | null;
    finalizedAt: string | null;
    publishedAt: string | null;
    totalParticipants: number;
    totalEvents: number;
  };
}

// =============================================================================
// 103: 団体管理（プラットフォーム管理者用）
// =============================================================================

export interface AdminGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
  suspendedAt?: string;
  suspendedBy?: string;
  suspendReason?: string;
}

export interface AdminGroupAuditLog {
  id: string;
  groupId: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  targetId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// 全団体一覧を取得（管理者用）
export async function adminGetAllGroups(options?: { status?: 'active' | 'suspended' | 'all' }) {
  const fn = httpsCallable(functions, 'adminGetAllGroups');
  const result = await fn(options || {});
  return result.data as { success: boolean; groups: AdminGroup[] };
}

// 団体を停止
export async function adminSuspendGroup(groupId: string, reason: string) {
  const fn = httpsCallable(functions, 'adminSuspendGroup');
  const result = await fn({ groupId, reason });
  return result.data as { success: boolean };
}

// 団体を再開
export async function adminResumeGroup(groupId: string) {
  const fn = httpsCallable(functions, 'adminResumeGroup');
  const result = await fn({ groupId });
  return result.data as { success: boolean };
}

// 団体を削除
export async function adminDeleteGroup(groupId: string) {
  const fn = httpsCallable(functions, 'adminDeleteGroup');
  const result = await fn({ groupId });
  return result.data as { success: boolean };
}

// 団体の監査ログを取得
export async function adminGetGroupAuditLogs(groupId: string, limit?: number) {
  const fn = httpsCallable(functions, 'adminGetGroupAuditLogs');
  const result = await fn({ groupId, limit: limit || 50 });
  return result.data as { success: boolean; logs: AdminGroupAuditLog[] };
}

// =============================================================================
// 106: ユーザー管理
// =============================================================================

export interface AdminUser {
  uid: string;
  nickname: string;
  siteRole: string;
  createdAt: string | null;
}

// ユーザー一覧取得
export async function adminGetUsers(options?: { siteRole?: string; nickname?: string; limit?: number }) {
  const fn = httpsCallable(functions, 'adminGetUsers');
  const result = await fn(options || {});
  return result.data as { success: boolean; users: AdminUser[] };
}

// ユーザーの siteRole を変更
export async function adminSetUserRole(targetUid: string, newRole: string) {
  const fn = httpsCallable(functions, 'adminSetUserRole');
  const result = await fn({ targetUid, newRole });
  return result.data as { success: boolean };
}

// 107: ユーザーの課金ステータスを一括取得
export interface UserBillingStatus {
  status: string;
  trialEndsAt?: string;
  isUchideshiFree: boolean;
  stripeCustomerId?: string;
}

export async function adminGetUserBillingStatuses(uids: string[]) {
  const fn = httpsCallable(functions, 'adminGetUserBillingStatuses');
  const result = await fn({ uids });
  return result.data as { statuses: Record<string, UserBillingStatus> };
}

// 内弟子割の設定
export async function adminSetUchideshiFree(uid: string, isUchideshiFree: boolean) {
  const fn = httpsCallable(functions, 'setUchideshiFree');
  const result = await fn({ uid, isUchideshiFree });
  return result.data as { success: boolean };
}

// 団体作成上限の設定
export async function adminSetMaxGroups(uid: string, maxGroups: number) {
  const fn = httpsCallable(functions, 'adminSetMaxGroups');
  const result = await fn({ uid, maxGroups });
  return result.data as { success: boolean };
}
