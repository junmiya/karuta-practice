# Tasks: 課金MVP（Stripe連携）

**Input**: Design documents from `/specs/107-billing-mvp/`
**Prerequisites**: 106-permission-system 完了、Stripe テストアカウント

## Format: `[ID] [P?] Description`

---

## Phase 1: Stripe セットアップ・型定義・Security Rules

**Purpose**: 基盤構築

- [ ] B001 Stripe ダッシュボードで Product（入門 月額）と Price（¥300/月）を作成。Price ID をメモ
- [ ] B002 [P] `functions/.env` に `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `UCHIDESHI_TOKEN` を設定
- [ ] B003 [P] Create billing types in apps/web/src/types/billing.ts: `BillingStatus` (`FREE|TRIAL|ACTIVE|CANCELED|PAST_DUE`), `Subscription` interface (with Stripe fields), `Entitlement` interface, `GroupCreationLimit` interface
- [ ] B004 [P] Add Firestore rules for `users/{uid}/billing/{docId}` (read: owner, write: false) and `users/{uid}/limits/{docId}` (read: owner, write: false) in firestore.rules
- [ ] B005 [P] Install `stripe` package: `cd functions && npm install stripe`

**Checkpoint**: Stripe 設定済み。型定義・ルール・パッケージ準備完了。

---

## Phase 2: 課金初期化バックエンド

**Purpose**: 入会時の自動レコード作成

- [ ] B006 Create `billingFunctions.ts` in functions/src/ with:
  - `ensureBillingOnJoin(uid)`: `billing/subscription` 未存在なら `joinedAt=serverTimestamp`, `trialEndsAt=+30日`, `planPriceYen=300`, `status='TRIAL'` を作成。`billing/entitlement` 未存在なら `isUchideshiFree=false` で初期化。`isUchideshiFree=true` の場合は `status='FREE'`
  - `setUchideshiFree(uid, isUchideshiFree)`: requireAdmin, `entitlement.isUchideshiFree` 更新
- [ ] B007 [P] Integrate `ensureBillingOnJoin` call at user profile creation trigger point
- [ ] B008 [P] Export billing functions from functions/src/index.ts

**Checkpoint**: 新規ログインで billing レコードが自動作成される。

---

## Phase 3: Stripe Checkout + Webhook

**Purpose**: 月額決済フローの自動化

- [ ] B009 Add `createCheckoutSession` to functions/src/billingFunctions.ts: requireAuth, create Stripe Customer if not exists (store `stripeCustomerId`), create Checkout Session with `mode='subscription'`, `price=STRIPE_PRICE_ID`, `success_url`, `cancel_url`, return `{ url: session.url }`
- [ ] B010 Add `createPortalSession` to functions/src/billingFunctions.ts: requireAuth, read `stripeCustomerId`, create Stripe Customer Portal session, return `{ url: session.url }`
- [ ] B011 Create `stripeWebhook.ts` in functions/src/: HTTP function (not Callable), verify signature with `stripe.webhooks.constructEvent()`, handle events:
  - `invoice.paid` → set `status='ACTIVE'`, update `currentPeriodEnd`
  - `invoice.payment_failed` → set `status='PAST_DUE'`
  - `customer.subscription.deleted` → set `status='CANCELED'`, set `canceledAt`
  - `customer.subscription.updated` → sync `currentPeriodEnd`
  - Idempotency: store processed event IDs, skip duplicates
- [ ] B012 [P] Export `createCheckoutSession`, `createPortalSession`, `handleStripeWebhook` from index.ts

**Checkpoint**: Stripe テストカードで決済 → Webhook → ACTIVE が自動で完了する。

---

## Phase 4: 内弟子QR入口

**Purpose**: 内弟子が課金なしで入会

- [ ] B013 Create `joinAsUchideshi(token)` in functions/src/joinFunctions.ts: validate token against `UCHIDESHI_TOKEN` env var, requireAuth, set `users/{uid}.siteRole='tester'` (106-permission-system の既存ロール), set `billing/entitlement.isUchideshiFree=true`, call `ensureBillingOnJoin(uid)` → status=FREE, return success
- [ ] B014 [P] Export `joinAsUchideshi` from index.ts
- [ ] B015 Create `UchideshiJoinPage.tsx` in apps/web/src/pages/: read token from URL, show welcome message, on login call `joinAsUchideshi(token)`, show success/error. Invalid token → error + normal signup link
- [ ] B016 [P] Add route `/join/uchideshi` to App.tsx

**Checkpoint**: QRリンクからログインで FREE + siteRole='tester' + isUchideshiFree=true が設定される。

---

## Phase 5: 団体作成上限

**Purpose**: 1人2団体までの制限

- [ ] B017 Add limit check to `createGroup` in functions/src/services/groupService.ts (or groupFunctions.ts): read `limits/groupCreation.maxGroups` (default 2), count `groups where ownerUserId==uid AND status=='active'`, reject if count >= maxGroups with「ご連絡ください」
- [ ] B018 [P] Add `adminSetMaxGroups(uid, maxGroups)` to billingFunctions.ts: requireAdmin, update `limits/groupCreation.maxGroups`
- [ ] B019 [P] Export `adminSetMaxGroups` from index.ts

**Checkpoint**: 3つ目の団体作成が拒否。maxGroups 引き上げで許可。

---

## Phase 6: フロントエンド

**Purpose**: 課金状態の表示・ガード・入門画面

- [ ] B020 Create `billing.service.ts` in apps/web/src/services/: `getSubscription(uid)`, `getEntitlement(uid)`, `deriveBillingStatus()`, `startCheckout()` (call createCheckoutSession CF → redirect), `openPortal()` (call createPortalSession CF → redirect)
- [ ] B021 Create `BillingGuard.tsx` in apps/web/src/components/: read billing status, PAST_DUE/CANCELED → redirect to EnrollmentPage, FREE/TRIAL/ACTIVE → render children
- [ ] B022 Create `EnrollmentPage.tsx` in apps/web/src/pages/: show plan info (¥300/月), 「入門する」ボタン → `startCheckout()`, 「無料機能を使い続ける」リンク
- [ ] B023 Add billing info section to apps/web/src/pages/ProfilePage.tsx: TRIAL→残日数, FREE→内弟子割, ACTIVE→入門済み+Portal リンク, PAST_DUE→入門CTA, CANCELED→再入門CTA
- [ ] B024 Wrap paid routes (稽古, 歌合) with `BillingGuard` + add `/enrollment`, `/join/uchideshi` routes in App.tsx
- [ ] B024b Add billing status column to AdminPage.tsx ユーザータブ: display `status` (FREE/TRIAL/ACTIVE/CANCELED/PAST_DUE), `trialEndsAt`, `isUchideshiFree` for each user. Read from `users/{uid}/billing/subscription` and `users/{uid}/billing/entitlement` via admin Cloud Function `adminGetUserBillingStatuses`
- [ ] B024c Create `adminGetUserBillingStatuses` in functions/src/billingFunctions.ts: requireAdmin, fetch billing subcollections for requested user IDs, return billing summaries
- [ ] B024d Export `adminGetUserBillingStatuses` from functions/src/index.ts

**Checkpoint**: 全課金UIフローが機能する。管理者がユーザータブで課金ステータスを確認できる。

---

## Phase 7: ビルド・検証

- [ ] B025 [P] TypeScript check: `cd apps/web && npx tsc --noEmit`
- [ ] B026 [P] Vite build: `cd apps/web && npm run build`
- [ ] B027 [P] Functions build: `cd functions && npm run build`
- [ ] B028 Create unit tests in functions/src/__tests__/billing.test.ts: `ensureBillingOnJoin` creates records, `deriveBillingStatus` priority logic, `joinAsUchideshi` token validation, group limit check
- [ ] B029 Manual E2E testing:
  1. 新規ログイン → TRIAL, マイページ残日数
  2. 内弟子QRリンク → FREE, 「内弟子割」表示
  3. trialEndsAt 過去設定 → PAST_DUE → 入門画面
  4. 「入門する」→ Stripe Checkout (4242...) → ACTIVE
  5. Customer Portal → 解約 → CANCELED
  6. 再入門 → ACTIVE
  7. 手習は PAST_DUE でも利用可
  8. 稽古は PAST_DUE でリダイレクト
  9. 団体2つ → 3つ目拒否 → maxGroups引き上げ → 成功

---

## Dependencies & Execution Order

```
Phase 1 (基盤) ──────────────────────────────────
   │
Phase 2 (課金初期化) ──┬── Phase 4 (内弟子) ───┐
   │                   │                       │
Phase 3 (Stripe) ──────┤                       │
   │                   │                       │
Phase 5 (団体上限) ────┘                       │
   │                                           │
Phase 6 (フロントエンド) ──────────────────────┘
   │
Phase 7 (検証) ────────────────────────────────
```

---

## Notes

- `ensureBillingOnJoin` は冪等（既存レコードがあればスキップ）
- `handleStripeWebhook` は HTTP Function（Callable ではない）。署名検証のため raw body が必要
- PAST_DUE 判定はクライアント側（`now > trialEndsAt` + DB status が TRIAL のまま）
- Stripe テスト環境では `4242 4242 4242 4242` で成功、`4000 0000 0000 0002` で失敗
- 内弟子は Stripe Customer を作成しない（完全バイパス）
