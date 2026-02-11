/**
 * 107: 課金MVP - 型定義
 */

// 課金ステータス
export type BillingStatus = 'FREE' | 'TRIAL' | 'ACTIVE' | 'CANCELED' | 'PAST_DUE';

// 課金ステータスラベル
export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  FREE: '内弟子割（永年無料）',
  TRIAL: 'お試し期間',
  ACTIVE: '入門済み',
  CANCELED: '解約済み',
  PAST_DUE: '未入門',
};

// 課金プラン定数
export const PLAN_PRICE_YEN = 330;
export const TRIAL_DAYS = 30;

// Subscription ドキュメント (users/{uid}/billing/subscription)
export interface Subscription {
  planPriceYen: number;
  status: BillingStatus;
  joinedAt: Date;
  trialEndsAt: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  canceledAt?: Date;
  updatedAt: Date;
}

// Entitlement ドキュメント (users/{uid}/billing/entitlement)
export interface Entitlement {
  isUchideshiFree: boolean;
  updatedAt: Date;
}

// GroupCreationLimit ドキュメント (users/{uid}/limits/groupCreation)
export interface GroupCreationLimit {
  maxGroups: number;
  updatedAt: Date;
}

// 課金状態の導出ロジック
export function deriveBillingStatus(
  subscription: Subscription | null,
  entitlement: Entitlement | null
): BillingStatus {
  if (entitlement?.isUchideshiFree) return 'FREE';
  if (!subscription) return 'PAST_DUE';
  if (subscription.status === 'ACTIVE') return 'ACTIVE';
  if (subscription.status === 'CANCELED') return 'CANCELED';
  if (new Date() < subscription.trialEndsAt) return 'TRIAL';
  return 'PAST_DUE';
}

// トライアル残日数
export function trialDaysRemaining(trialEndsAt: Date): number {
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
