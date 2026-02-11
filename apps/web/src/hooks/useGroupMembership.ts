/**
 * 103: 団体機能 - メンバーシップ管理フック
 */
import { useState, useEffect, useCallback } from 'react';
import {
  joinGroup as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
  getGroupMembers as fetchGroupMembers,
  changeRole as apiChangeRole,
  removeMember as apiRemoveMember,
} from '@/services/group.service';
import type {
  GroupMember,
  GroupRole,
  JoinGroupResponse,
  JoinGroupError,
} from '@/types/group';

/**
 * 団体に参加するフック
 */
export function useJoinGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinGroup = useCallback(async (params: {
    groupId: string;
    inviteCode: string;
  }): Promise<JoinGroupResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiJoinGroup(params);
      if ('success' in result && result.success) {
        return result as JoinGroupResponse;
      }
      // エラーレスポンス
      const errorResult = result as JoinGroupError;
      setError(errorResult.message);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '参加に失敗しました';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { joinGroup, loading, error, clearError: () => setError(null) };
}

/**
 * 団体から退会するフック
 */
export function useLeaveGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiLeaveGroup(groupId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to leave group'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { leaveGroup, loading, error };
}

/**
 * 団体メンバー一覧を取得するフック
 */
export function useGroupMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchGroupMembers(groupId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch members'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { members, loading, error, refresh };
}

/**
 * メンバーのロールを変更するフック
 */
export function useChangeRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const changeRole = useCallback(async (params: {
    groupId: string;
    targetUserId: string;
    newRole: GroupRole;
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiChangeRole(params);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to change role'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { changeRole, loading, error };
}

/**
 * メンバーを除名するフック
 */
export function useRemoveMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeMember = useCallback(async (params: {
    groupId: string;
    targetUserId: string;
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRemoveMember(params);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove member'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeMember, loading, error };
}
