# API Contract: Stripe Webhook (HTTP Function)

## handleStripeWebhook

Stripe からのイベント通知を受信・処理する HTTP Function。

- **Method**: POST
- **URL**: `https://<region>-<project>.cloudfunctions.net/handleStripeWebhook`
- **Auth**: Stripe Webhook Signing Secret（`stripe-signature` ヘッダ）
- **Content-Type**: `application/json`（raw body 必須）

### 処理イベント

| Event | Action | Firestore Update |
|-------|--------|-----------------|
| `invoice.paid` | サブスク有効化 | `status: 'ACTIVE'`, `stripeSubscriptionId` 設定 |
| `invoice.payment_failed` | 決済失敗 | `status: 'PAST_DUE'` |
| `customer.subscription.deleted` | 解約完了 | `status: 'CANCELED'`, `canceledAt` 設定 |
| `customer.subscription.updated` | 期間更新 | `currentPeriodEnd` 同期 |

### 冪等性

- `stripe_events/{eventId}` コレクションに処理済みイベントID を記録
- 同一イベントID の再送は処理スキップ（200 返却）

### レスポンス

| Status | Body | Description |
|--------|------|-------------|
| 200 | `{ received: true }` | 正常処理 or 重複スキップ |
| 400 | `Webhook signature verification failed` | 署名検証失敗 |
| 200 | `{ received: true }` | 関心外イベント（無視） |

### Customer → UID マッピング

Stripe Customer の `metadata.firebaseUid` フィールドで Firebase UID を特定。
未設定の場合は処理スキップ（ログ出力のみ）。
