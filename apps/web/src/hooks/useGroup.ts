/**
 * 103: 団体機能 - 団体管理フック
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getGroup as fetchGroup,
  getMyGroups as fetchMyGroups,
  createGroup as apiCreateGroup,
  updateGroup as apiUpdateGroup,
  deleteGroup as apiDeleteGroup,
  getInviteCode as fetchInviteCode,
  getInviteInfo as fetchInviteInfo,
  regenerateInviteCode as apiRegenerateInviteCode,
  revokeInviteCode as apiRevokeInviteCode,
} from '@/services/group.service';
import type {
  Group,
  GroupWithMembership,
  InviteInfo,
  InviteCodeResponse,
  CreateGroupResponse,
} from '@/types/group';

/**
 * 自分の所属団体一覧を取得するフック
 */
export function useMyGroups() {
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyGroups();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}

/**
 * 団体詳細を取得するフック
 */
export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchGroup(groupId);
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch group'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { group, loading, error, refresh };
}

/**
 * 団体を作成するフック
 */
export function useCreateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createGroup = useCallback(async (params: {
    name: string;
    description?: string;
  }): Promise<CreateGroupResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCreateGroup(params);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create group'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createGroup, loading, error };
}

/**
 * 団体を更新するフック
 */
export function useUpdateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateGroup = useCallback(async (params: {
    groupId: string;
    name?: string;
    description?: string;
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiUpdateGroup(params);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update group'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateGroup, loading, error };
}

/**
 * 団体を削除するフック
 */
export function useDeleteGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiDeleteGroup(groupId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete group'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteGroup, loading, error };
}

/**
 * 招待コード情報を取得するフック
 */
export function useInviteInfo(groupId: string | undefined) {
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setInviteInfo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchInviteInfo(groupId);
      setInviteInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invite info'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { inviteInfo, loading, error, refresh };
}

/**
 * 招待コードを取得するフック（管理者用）
 */
export function useInviteCode(groupId: string | undefined) {
  const [inviteCode, setInviteCode] = useState<InviteCodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!groupId) {
      setInviteCode(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchInviteCode(groupId);
      setInviteCode(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invite code'));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const regenerate = useCallback(async (params?: {
    expiresInDays?: number;
    maxJoins?: number;
  }): Promise<InviteCodeResponse | null> => {
    if (!groupId) return null;

    setLoading(true);
    setError(null);
    try {
      const data = await apiRegenerateInviteCode({
        groupId,
        ...params,
      });
      setInviteCode(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to regenerate invite code'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const revoke = useCallback(async (): Promise<boolean> => {
    if (!groupId) return false;

    setLoading(true);
    setError(null);
    try {
      await apiRevokeInviteCode(groupId);
      setInviteCode(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revoke invite code'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  return { inviteCode, loading, error, fetch, regenerate, revoke };
}
