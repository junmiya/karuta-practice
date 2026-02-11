# API Contracts: 107-billing-mvp (Callable Functions)

すべて Firebase Cloud Functions Callable（region: `asia-northeast1`）。

---

## ensureBillingOnJoin

課金レコード初期化（冪等）。

- **Auth**: 認証必須（自分自身のみ）
- **Input**: なし
- **Output**: `{ success: boolean }`
- **Side Effects**: `users/{uid}/billing/subscription`, `users/{uid}/billing/entitlement`, `users/{uid}/limits/groupCreation` を作成（既存ならスキップ）
- **Error**: 認証エラー（`unauthenticated`）

---

## createCheckoutSession

Stripe Checkout Session を生成。

- **Auth**: 認証必須
- **Input**: `{ successUrl?: string, cancelUrl?: string }`
- **Output**: `{ url: string }` — Stripe Checkout ページの URL
- **Side Effects**: Stripe Customer 作成（未作成の場合）、`stripeCustomerId` を subscription に保存
- **Error**: `internal`（STRIPE_SECRET_KEY / STRIPE_PRICE_ID 未設定）

---

## createPortalSession

Stripe Customer Portal Session を生成。

- **Auth**: 認証必須
- **Input**: `{ returnUrl?: string }`
- **Output**: `{ url: string }` — Stripe Customer Portal の URL
- **Error**: `failed-precondition`（Stripe Customer 未作成）

---

## joinAsUchideshi

内弟子QR入口。トークン検証→課金なし入会。

- **Auth**: 認証必須
- **Input**: `{ token: string }`
- **Output**: `{ success: boolean }`
- **Side Effects**: `siteRole: 'tester'`、`isUchideshiFree: true`、`status: 'FREE'` を設定。billing レコードを初期化。
- **Error**: `invalid-argument`（トークン不一致）、`internal`（UCHIDESHI_TOKEN 未設定）

---

## setUchideshiFree (admin)

内弟子割の適用/解除。

- **Auth**: 管理者のみ（`requireAdmin`）
- **Input**: `{ uid: string, isUchideshiFree: boolean }`
- **Output**: `{ success: boolean }`
- **Side Effects**: `entitlement.isUchideshiFree` 更新。`true` の場合は `subscription.status` も `'FREE'` に変更。
- **Error**: `invalid-argument`、`permission-denied`

---

## adminSetMaxGroups (admin)

団体作成上限の変更。

- **Auth**: 管理者のみ（`requireAdmin`）
- **Input**: `{ uid: string, maxGroups: number }` — maxGroups >= 0
- **Output**: `{ success: boolean }`
- **Side Effects**: `limits/groupCreation.maxGroups` 更新
- **Error**: `invalid-argument`、`permission-denied`

---

## adminGetUserBillingStatuses (admin)

ユーザーの課金ステータス一括取得。

- **Auth**: 管理者のみ（`requireAdmin`）
- **Input**: `{ uids: string[] }` — 最大50件
- **Output**: `{ statuses: Record<string, { status: string, trialEndsAt?: string, isUchideshiFree: boolean, stripeCustomerId?: string }> }`
- **Error**: `invalid-argument`（空配列）、`permission-denied`
