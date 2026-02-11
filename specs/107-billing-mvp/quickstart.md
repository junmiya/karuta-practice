# Quickstart: 107-billing-mvp

## Prerequisites

- Node.js 20+
- Firebase CLI
- 106-permission-system の実装完了
- **Stripe アカウント**（テストモードでOK）

## Stripe Setup

```bash
# 1. Stripe CLI インストール
brew install stripe/stripe-cli/stripe

# 2. Stripe ダッシュボードで以下を作成
#    - Product: 「入門（月額）」
#    - Price: ¥300/月 (recurring)
#    → Price ID をメモ（例: price_xxx）

# 3. Stripe Webhook の設定（ローカル開発）
stripe listen --forward-to localhost:5001/<project-id>/us-central1/handleStripeWebhook

# 4. 環境変数設定 (functions/.env)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx
UCHIDESHI_TOKEN=<ランダム文字列>
```

## Development Setup

```bash
# 1. Feature branch
git checkout 107-billing-mvp

# 2. Install
cd apps/web && npm install
cd ../../functions && npm install stripe

# 3. Frontend dev
cd apps/web && npm run dev

# 4. Functions emulator + Stripe listener
cd functions && npm run serve
# 別ターミナルで:
stripe listen --forward-to localhost:5001/<project-id>/us-central1/handleStripeWebhook
```

## Key Files

### New Files

| File | Purpose |
| ---- | ------- |
| `apps/web/src/types/billing.ts` | `BillingStatus`, `Subscription`, `Entitlement` 型 |
| `apps/web/src/services/billing.service.ts` | billing読み取り + Checkout/Portal 呼び出し |
| `apps/web/src/components/BillingGuard.tsx` | 課金対象機能ガード |
| `apps/web/src/pages/UchideshiJoinPage.tsx` | 内弟子QR入口 |
| `apps/web/src/pages/EnrollmentPage.tsx` | 入門確認画面 |
| `functions/src/billingFunctions.ts` | ensureBilling, Checkout, Portal, setFree, adminGetUserBillingStatuses |
| `functions/src/stripeWebhook.ts` | Webhook handler |
| `functions/src/joinFunctions.ts` | joinAsUchideshi |

### Modified Files

| File | Change |
| ---- | ------ |
| `functions/src/services/groupService.ts` | 団体上限チェック追加 |
| `functions/src/index.ts` | 新CF export |
| `apps/web/src/pages/ProfilePage.tsx` | 課金情報セクション |
| `apps/web/src/pages/AdminPage.tsx` | ユーザータブに課金ステータス列追加 |
| `apps/web/src/App.tsx` | ルート追加 + BillingGuard |
| `firestore.rules` | billing/limits ルール |

## Implementation Order

1. Stripe セットアップ（Product/Price作成、環境変数）
2. Firestore Security Rules
3. 型定義（`billing.ts`）
4. `ensureBillingOnJoin` + `stripeWebhook`
5. `createCheckoutSession` + `createPortalSession`
6. 内弟子入口（`joinAsUchideshi` + `UchideshiJoinPage`）
7. フロントエンド（BillingGuard, EnrollmentPage, ProfilePage, AdminPage課金列）
8. 団体上限チェック
9. ルーティング（App.tsx）

## Testing

```bash
# Build checks
cd apps/web && npx tsc --noEmit
cd apps/web && npm run build
cd functions && npm run build

# Stripe テストカード
# 成功: 4242 4242 4242 4242
# 失敗: 4000 0000 0000 0002

# Manual testing
# 1. 新規ログイン → TRIAL
# 2. 内弟子QRリンク → FREE
# 3. trialEndsAt を過去に設定 → PAST_DUE → 入門画面
# 4. 「入門する」→ Stripe Checkout → テストカード → ACTIVE
# 5. Customer Portal → 解約 → CANCELED
# 6. 団体2つ作成 → 3つ目拒否
```
