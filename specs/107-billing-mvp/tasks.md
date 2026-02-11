# Tasks: 課金MVP（Stripe連携・内弟子入口・団体上限）

**Input**: Design documents from `/specs/107-billing-mvp/`
**Prerequisites**: 106-permission-system 完了、Stripe テストアカウント

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stripe 環境設定・パッケージ・型定義・Security Rules

- [x] T001 Stripe ダッシュボードで Product（入門 月額）と Price（¥330/月, tax_inclusive, recurring）を作成。Price ID をメモ
- [x] T002 [P] `functions/.env` に `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `UCHIDESHI_TOKEN` を設定
- [x] T003 [P] Install `stripe` package: `cd functions && npm install stripe`
- [x] T004 [P] Create billing types in `apps/web/src/types/billing.ts`: `BillingStatus` type (`FREE|TRIAL|ACTIVE|CANCELED|PAST_DUE`), `BILLING_STATUS_LABELS`, `PLAN_PRICE_YEN=330`, `TRIAL_DAYS=30`, `Subscription` interface, `Entitlement` interface, `GroupCreationLimit` interface, `deriveBillingStatus()`, `trialDaysRemaining()`
- [x] T005 [P] Add Firestore rules for `users/{uid}/billing/{docId}` (read: owner only, write: false), `users/{uid}/limits/{docId}` (read: owner only, write: false), `stripe_events/{eventId}` (read/write: false) in `firestore.rules`

**Checkpoint**: Stripe 設定済み。型定義・ルール・パッケージ準備完了。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 課金初期化バックエンド — 全 User Story が依存する基盤

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create `functions/src/billingFunctions.ts` with `ensureBillingOnJoinInternal(uid)`: idempotent billing record creation — `billing/subscription` (`planPriceYen=330`, `status='TRIAL'` or `'FREE'` if uchideshi, `joinedAt`, `trialEndsAt=+30d`), `billing/entitlement` (`isUchideshiFree=false`), `limits/groupCreation` (`maxGroups=2`). Also export Callable wrapper `ensureBillingOnJoin`
- [x] T007 [P] Create `functions/src/stripeWebhook.ts` with `handleStripeWebhook` HTTP Function: verify signature via `stripe.webhooks.constructEvent()`, idempotency via `stripe_events/{eventId}` collection, handle `invoice.paid` → ACTIVE, `invoice.payment_failed` → PAST_DUE, `customer.subscription.deleted` → CANCELED, `customer.subscription.updated` → sync currentPeriodEnd. Map Customer→UID via `metadata.firebaseUid`
- [x] T008 [P] Create `apps/web/src/services/billing.service.ts`: `getSubscription(uid)`, `getEntitlement(uid)`, `getBillingStatus(uid)` (uses `deriveBillingStatus`), `ensureBilling()` (calls ensureBillingOnJoin CF), `startCheckout()` (calls createCheckoutSession CF → redirect), `openPortal()` (calls createPortalSession CF → redirect), `joinAsUchideshi(token)` (calls joinAsUchideshi CF)
- [x] T009 Export `ensureBillingOnJoin` and `handleStripeWebhook` from `functions/src/index.ts`

**Checkpoint**: Foundation ready — 課金レコード初期化とWebhook受信が機能する。

---

## Phase 3: User Story 1 — 新規ユーザーがトライアル開始 (Priority: P1) 🎯 MVP

**Goal**: 初回ログインで30日無料トライアルが自動設定され、マイページで残日数を確認できる

**Independent Test**: 新規ユーザーでログイン → マイページに「お試し期間：残りN日」「月額330円（税込）」が表示される

### Implementation for User Story 1

- [x] T010 [US1] Add billing info section to `apps/web/src/pages/ProfilePage.tsx`: call `ensureBilling()` then `getBillingStatus()` on mount, display TRIAL status with `trialDaysRemaining()`, show price as 「月額330円（税込）」, handle `?billing=success` URL param for post-checkout success message

**Checkpoint**: 新規ログイン → TRIAL 自動設定 → マイページに残日数表示。

---

## Phase 4: User Story 2 — トライアル期限切れ→入門画面→Stripe決済 (Priority: P1)

**Goal**: TRIAL期限切れ→PAST_DUE→入門画面表示→Stripe Checkout→ACTIVE 自動完了

**Independent Test**: trialEndsAt を過去に設定 → 稽古にアクセス → 入門画面にリダイレクト → 「入門する」→ Stripe テストカード(4242...) → ACTIVE

### Implementation for User Story 2

- [x] T011 [US2] Add `createCheckoutSession` to `functions/src/billingFunctions.ts`: requireAuth, create Stripe Customer if not exists (store `stripeCustomerId` with `metadata.firebaseUid`), create Checkout Session (`mode='subscription'`, `price=STRIPE_PRICE_ID`), return `{ url }`
- [x] T012 [P] [US2] Add `createPortalSession` to `functions/src/billingFunctions.ts`: requireAuth, read `stripeCustomerId`, create Stripe Customer Portal session, return `{ url }`
- [x] T013 [US2] Export `createCheckoutSession` and `createPortalSession` from `functions/src/index.ts`
- [x] T014 [US2] Create `apps/web/src/components/BillingGuard.tsx`: read billing status on mount, PAST_DUE/CANCELED → redirect to `/enrollment`, FREE/TRIAL/ACTIVE → render children, handle loading/initial billing setup
- [x] T015 [US2] Create `apps/web/src/pages/EnrollmentPage.tsx`: show plan info (「月額330円（税込）」), 「入門する」button → `startCheckout()`, 「無料機能を使い続ける」link to `/tenarai`
- [x] T016 [US2] Wrap paid routes with `BillingGuard` in `apps/web/src/App.tsx`: keiko, practice12, utaawase, entry, official, kyui-exam, kyui-match. Add `/enrollment` route

**Checkpoint**: PAST_DUE → 入門画面 → Stripe Checkout → Webhook → ACTIVE の全フロー動作。

---

## Phase 5: User Story 3 — 内弟子QRリンクで課金なし入会 (Priority: P1)

**Goal**: 管理者配布のQRリンクから課金なしで永年無料入会

**Independent Test**: `/join/uchideshi?token=<valid>` にアクセス → ログイン → FREE + siteRole='tester' 設定 → マイページに「内弟子割（永年無料）」表示

### Implementation for User Story 3

- [x] T017 [US3] Create `functions/src/joinFunctions.ts` with `joinAsUchideshi(token)`: requireAuth, validate token against `UCHIDESHI_TOKEN` env var, set `users/{uid}.siteRole='tester'`, set `billing/entitlement.isUchideshiFree=true`, call `ensureBillingOnJoinInternal(uid)` → status='FREE'
- [x] T018 [P] [US3] Export `joinAsUchideshi` from `functions/src/index.ts`
- [x] T019 [US3] Create `apps/web/src/pages/UchideshiJoinPage.tsx`: read token from `?token=` URL param, require login (show login UI if not authenticated), call `joinAsUchideshi(token)`, show success message + navigate to home, show error + normal signup link on invalid token
- [x] T020 [US3] Add route `/join/uchideshi` to `apps/web/src/App.tsx`

**Checkpoint**: QRリンク経由で FREE + tester が設定。Stripe を一切経験しない。

---

## Phase 6: User Story 4 — ACTIVE解約/更新失敗 (Priority: P2)

**Goal**: Customer Portal から解約→CANCELED、カード失敗→PAST_DUE、再入門→ACTIVE

**Independent Test**: ACTIVE ユーザーのマイページで「カード管理・解約」リンク → Customer Portal → 解約 → CANCELED → 入門画面

### Implementation for User Story 4

- [x] T021 [US4] Add ACTIVE user billing display to `apps/web/src/pages/ProfilePage.tsx`: show 「入門済み」「月額330円（税込）」and 「カード管理・解約」button calling `openPortal()`. Also add PAST_DUE/CANCELED 「入門して続ける」CTA calling `startCheckout()`

**Checkpoint**: ACTIVE→解約→CANCELED→再入門→ACTIVE の全ライフサイクル動作。Webhook が全イベントを正しく処理。

---

## Phase 7: User Story 5 — マイページ課金情報確認 (Priority: P2)

**Goal**: 全ステータスで適切な課金情報を表示

**Independent Test**: 各ステータス（TRIAL/FREE/ACTIVE/PAST_DUE/CANCELED）でマイページを確認し、正しいラベル・CTA・金額が表示される

### Implementation for User Story 5

- [x] T022 [US5] Verify and polish billing info display in `apps/web/src/pages/ProfilePage.tsx`: TRIAL→「お試し期間：残りN日」+「月額330円（税込）」, FREE→「内弟子割（永年無料）」, ACTIVE→「入門済み」+「月額330円（税込）」+Portal link, PAST_DUE→「入門して続ける」CTA, CANCELED→「入門して続ける」CTA. Ensure `BILLING_STATUS_LABELS` from types/billing.ts is used consistently

**Checkpoint**: 全5ステータスでマイページの課金情報が正しく表示される。

---

## Phase 8: User Story 6 — 団体を2つまで作成 (Priority: P2)

**Goal**: 1人2団体まで作成可能、3つ目は拒否（「ご連絡ください」）

**Independent Test**: 団体を2つ作成 → 3つ目の作成が拒否 → 管理者が maxGroups=3 に変更 → 3つ目成功

### Implementation for User Story 6

- [x] T023 [US6] Add group creation limit check to `createGroup` in `functions/src/groupFunctions.ts`: read `users/{uid}/limits/groupCreation.maxGroups` (default 2), count `groups where ownerUserId==uid AND status=='active'`, reject with `resource-exhausted` error if count >= maxGroups. Error message: 「団体は${maxGroups}つまで作成できます。それ以上の作成をご希望の場合はご連絡ください。」
- [x] T024 [P] [US6] Add `adminSetMaxGroups(uid, maxGroups)` to `functions/src/billingFunctions.ts`: requireAdmin, validate maxGroups >= 0, update `limits/groupCreation.maxGroups`
- [x] T025 [US6] Export `adminSetMaxGroups` from `functions/src/index.ts`

**Checkpoint**: 2団体作成→3つ目拒否→maxGroups引き上げ→3つ目成功。

---

## Phase 9: User Story 7 — 管理者課金ビュー・操作 (Priority: P2)

**Goal**: 管理者がAdminPageのユーザータブで課金ステータスを確認・内弟子割トグル・maxGroups変更

**Independent Test**: AdminPage → ユーザータブ → 課金ステータス列に各ユーザーのステータスBadge表示 → 内弟子割ボタンで FREE 切替 → ステータス更新確認

### Implementation for User Story 7

- [x] T026 [US7] Add `setUchideshiFree(uid, isUchideshiFree)` to `functions/src/billingFunctions.ts`: requireAdmin, update `entitlement.isUchideshiFree`, if true → set `subscription.status='FREE'`
- [x] T027 [P] [US7] Add `adminGetUserBillingStatuses(uids)` to `functions/src/billingFunctions.ts`: requireAdmin, batch fetch billing for up to 50 UIDs, return `{ statuses: Record<string, { status, trialEndsAt?, isUchideshiFree, stripeCustomerId? }> }`
- [x] T028 [US7] Export `setUchideshiFree` and `adminGetUserBillingStatuses` from `functions/src/index.ts`
- [x] T029 [US7] Add `adminSetUchideshiFree`, `adminSetMaxGroups`, `adminGetUserBillingStatuses` to `apps/web/src/services/admin-v2.service.ts`
- [x] T030 [US7] Add billing status column to `apps/web/src/pages/AdminPage.tsx` ユーザータブ: fetch billing via `adminGetUserBillingStatuses`, display status Badge (FREE/TRIAL/ACTIVE/CANCELED/PAST_DUE), add uchideshi toggle button per user calling `adminSetUchideshiFree`

**Checkpoint**: 管理者がユーザー一覧で課金ステータス確認・内弟子割トグル・maxGroups変更が動作。

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: ビルド検証・統合テスト

- [x] T031 [P] TypeScript type check: `cd apps/web && npx tsc --noEmit`
- [x] T032 [P] Vite build: `cd apps/web && npx vite build`
- [x] T033 [P] Functions build: `cd functions && npm run build`
- [x] T034 Manual E2E testing:
  1. 新規ログイン → TRIAL, マイページ残日数表示
  2. 内弟子QRリンク → FREE, 「内弟子割（永年無料）」表示
  3. trialEndsAt を過去に設定 → PAST_DUE → 入門画面リダイレクト
  4. 「入門する」→ Stripe Checkout (4242 4242 4242 4242) → ACTIVE
  5. Customer Portal → 解約 → CANCELED
  6. 再入門 → ACTIVE
  7. 手習は PAST_DUE でも利用可
  8. 稽古は PAST_DUE で入門画面にリダイレクト
  9. 団体2つ作成 → 3つ目拒否 → maxGroups引き上げ → 成功
  10. AdminPage → ユーザータブ → 課金ステータス確認 → 内弟子割トグル
- [x] T035 Deploy: `firebase deploy`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational. ProfilePage billing display
- **US2 (Phase 4)**: Depends on Foundational. Checkout + BillingGuard + EnrollmentPage
- **US3 (Phase 5)**: Depends on Foundational. joinAsUchideshi + UchideshiJoinPage
- **US4 (Phase 6)**: Depends on US2 (Checkout/Portal must exist). Customer Portal integration
- **US5 (Phase 7)**: Depends on US1 + US2 (ProfilePage already has billing section). Polish all status displays
- **US6 (Phase 8)**: Depends on Foundational only. Group limit check is independent
- **US7 (Phase 9)**: Depends on Foundational only. Admin billing view is independent
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only → Independent
- **US2 (P1)**: Foundational only → Independent (can parallel with US1)
- **US3 (P1)**: Foundational only → Independent (can parallel with US1, US2)
- **US4 (P2)**: US2 must be complete (needs Checkout/Portal)
- **US5 (P2)**: US1 + US2 should be complete (needs ProfilePage billing section)
- **US6 (P2)**: Foundational only → Independent (can parallel with P1 stories)
- **US7 (P2)**: Foundational only → Independent (can parallel with P1 stories)

### Parallel Opportunities

**After Foundational phase, these can run in parallel:**
- US1 + US2 + US3 + US6 + US7 (all independent of each other)

**Sequential dependencies:**
- US4 → after US2
- US5 → after US1 + US2

---

## Parallel Example: P1 Stories (US1 + US2 + US3)

```bash
# After Foundational phase completes, launch all P1 stories in parallel:
Task: "[US1] Add billing info section to ProfilePage.tsx"
Task: "[US2] Add createCheckoutSession to billingFunctions.ts"
Task: "[US3] Create joinFunctions.ts with joinAsUchideshi"

# US6 and US7 can also start in parallel:
Task: "[US6] Add group creation limit check to groupFunctions.ts"
Task: "[US7] Add setUchideshiFree to billingFunctions.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (Stripe dashboard + env + types + rules)
2. Complete Phase 2: Foundational (ensureBilling + Webhook + billing.service)
3. Complete Phase 3-5: US1 + US2 + US3 (P1 stories — core billing flow)
4. **STOP and VALIDATE**: Test TRIAL→PAST_DUE→Checkout→ACTIVE, QR→FREE
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 + US3 → Core billing flow (MVP!)
3. US4 + US5 → Lifecycle management + ProfilePage polish
4. US6 → Group limits
5. US7 → Admin billing view
6. Polish → Build verification + E2E testing

---

## Notes

- `ensureBillingOnJoin` は冪等（既存レコードがあればスキップ）
- `handleStripeWebhook` は HTTP Function（Callable ではない）。署名検証のため raw body が必要
- PAST_DUE 判定はクライアント側（`now > trialEndsAt` + DB status が TRIAL のまま）→ `deriveBillingStatus()` で判定
- Stripe テストカード: 成功 `4242 4242 4242 4242`、失敗 `4000 0000 0000 0002`
- 内弟子は Stripe Customer を作成しない（完全バイパス）
- 価格表記は「月額330円（税込）」に統一
- Stripe SDK v20.3.1: `new Stripe(key)` でデフォルト API バージョン利用
