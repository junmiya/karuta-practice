/**
 * 105: 手引招待機能 - フロントエンドサービス
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  CreateInviteInput,
  CreateInviteOutput,
  GetInviteInfoInput,
  GetInviteInfoOutput,
  JoinInviteInput,
  JoinInviteOutput,
} from '@/types/invite';

/**
 * 招待を作成
 */
export async function createInvite(targetMode: string): Promise<CreateInviteOutput> {
  const fn = httpsCallable<CreateInviteInput, CreateInviteOutput>(
    functions,
    'createTebikiInvite'
  );
  const result = await fn({ targetMode: targetMode as CreateInviteInput['targetMode'] });
  return result.data;
}

/**
 * 招待情報を取得
 */
export async function getInviteInfo(
  inviteId?: string,
  inviteCode?: string
): Promise<GetInviteInfoOutput> {
  const fn = httpsCallable<GetInviteInfoInput, GetInviteInfoOutput>(
    functions,
    'getTebikiInviteInfo'
  );
  const result = await fn({ inviteId, inviteCode });
  return result.data;
}

/**
 * 招待に参加
 */
export async function joinInvite(
  inviteId?: string,
  inviteCode?: string
): Promise<JoinInviteOutput> {
  const fn = httpsCallable<JoinInviteInput, JoinInviteOutput>(
    functions,
    'joinTebikiInvite'
  );
  const result = await fn({ inviteId, inviteCode });
  return result.data;
}
