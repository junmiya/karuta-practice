/**
 * 107: 課金MVP - フロントエンドサービス
 */
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from './firebase';
import type { Subscription, Entitlement, BillingStatus } from '@/types/billing';
import { deriveBillingStatus } from '@/types/billing';

/**
 * billing/subscription を取得
 */
export async function getSubscription(uid: string): Promise<Subscription | null> {
  const ref = doc(db, 'users', uid, 'billing', 'subscription');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    joinedAt: data.joinedAt?.toDate(),
    trialEndsAt: data.trialEndsAt?.toDate(),
    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
    canceledAt: data.canceledAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as Subscription;
}

/**
 * billing/entitlement を取得
 */
export async function getEntitlement(uid: string): Promise<Entitlement | null> {
  const ref = doc(db, 'users', uid, 'billing', 'entitlement');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    updatedAt: data.updatedAt?.toDate(),
  } as Entitlement;
}

/**
 * 課金ステータスを取得
 */
export async function getBillingStatus(uid: string): Promise<{
  status: BillingStatus;
  subscription: Subscription | null;
  entitlement: Entitlement | null;
}> {
  const [subscription, entitlement] = await Promise.all([
    getSubscription(uid),
    getEntitlement(uid),
  ]);
  const status = deriveBillingStatus(subscription, entitlement);
  return { status, subscription, entitlement };
}

/**
 * 課金レコード初期化（ログイン後に呼ぶ）
 */
export async function ensureBilling(): Promise<void> {
  const fn = httpsCallable(functions, 'ensureBillingOnJoin');
  await fn({});
}

/**
 * Stripe Checkout を開始（リダイレクト）
 */
export async function startCheckout(): Promise<void> {
  const fn = httpsCallable<
    { successUrl?: string; cancelUrl?: string },
    { url: string }
  >(functions, 'createCheckoutSession');
  const result = await fn({
    successUrl: window.location.origin + '/profile',
    cancelUrl: window.location.origin + '/enrollment',
  });
  if (result.data.url) {
    window.location.href = result.data.url;
  }
}

/**
 * Stripe Customer Portal を開く（リダイレクト）
 */
export async function openPortal(): Promise<void> {
  const fn = httpsCallable<
    { returnUrl?: string },
    { url: string }
  >(functions, 'createPortalSession');
  const result = await fn({
    returnUrl: window.location.origin + '/profile',
  });
  if (result.data.url) {
    window.location.href = result.data.url;
  }
}

/**
 * 内弟子として参加
 */
export async function joinAsUchideshi(token: string): Promise<{ success: boolean }> {
  const fn = httpsCallable<{ token: string }, { success: boolean }>(
    functions, 'joinAsUchideshi'
  );
  const result = await fn({ token });
  return result.data;
}
