# Data Model: 107-billing-mvp

## 新規コレクション（サブコレクション）

### users/{uid}/billing/subscription

課金契約の状態 + Stripe 連携情報。サーバのみ書き込み可能。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `planPriceYen` | int | Yes | 330固定（税込）。将来変更に備え保持 |
| `status` | string | Yes | `"FREE"` / `"TRIAL"` / `"ACTIVE"` / `"CANCELED"` / `"PAST_DUE"` |
| `joinedAt` | Timestamp | Yes | サーバ付与。入会日時 |
| `trialEndsAt` | Timestamp | Yes | `joinedAt` + 30日（サーバ付与） |
| `stripeCustomerId` | string? | No | Stripe Customer ID（Checkout時に作成） |
| `stripeSubscriptionId` | string? | No | Stripe Subscription ID（決済後に設定） |
| `currentPeriodEnd` | Timestamp? | No | Stripe から取得。次回更新日 |
| `canceledAt` | Timestamp? | No | 解約日時（CANCELED時） |
| `updatedAt` | Timestamp | Yes | 最終更新日時 |

**ステータス遷移**:

```
                    ┌──────────┐
                    │   FREE   │  ← isUchideshiFree=true の場合（Stripe不使用）
                    └──────────┘

                    ┌──────────┐
 初回ログイン ────▶ │  TRIAL   │  ← 30日間
                    └────┬─────┘
                         │ trialEndsAt 経過
                    ┌────▼─────┐
                    │ PAST_DUE │  ← 入門画面表示、成績保持
                    └────┬─────┘
                         │「入門する」→ Stripe Checkout
                    ┌────▼─────┐
                    │  ACTIVE  │  ← Webhook: invoice.paid
                    └────┬─────┘
                    ┌────┴──────────────────┐
          解約      │                カード失敗│
  ┌────────▼───┐              ┌─────▼─────┐
  │  CANCELED  │              │  PAST_DUE │ ← Webhook: invoice.payment_failed
  └────────────┘              └───────────┘
       │ 再入門（Stripe Checkout）
       └──────────▶ ACTIVE
```

**判定ロジック**:

```typescript
function deriveBillingStatus(subscription, entitlement): BillingStatus {
  if (entitlement?.isUchideshiFree) return 'FREE';
  if (subscription.status === 'ACTIVE') return 'ACTIVE';
  if (subscription.status === 'CANCELED') return 'CANCELED';
  if (now < subscription.trialEndsAt) return 'TRIAL';
  return 'PAST_DUE';
}
```

---

### users/{uid}/billing/entitlement

課金特典。サーバのみ書き込み可能。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `isUchideshiFree` | bool | Yes | `true` = 内弟子割（永年無料）。admin のみ更新 |
| `updatedAt` | Timestamp | Yes | 最終更新日時 |

---

### users/{uid}/limits/groupCreation

団体作成上限。サーバのみ書き込み可能。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `maxGroups` | int | Yes | デフォルト2。管理者のみ更新 |
| `updatedAt` | Timestamp | Yes | 最終更新日時 |

---

## Stripe 連携データフロー

```
┌─────────────┐       ┌──────────────┐       ┌────────────────┐
│  Frontend   │──────▶│ Cloud Func   │──────▶│    Stripe      │
│ (入門ボタン) │       │ createCheckout│       │ Checkout Page  │
└─────────────┘       └──────────────┘       └───────┬────────┘
                                                     │ 決済完了
                      ┌──────────────┐       ┌───────▼────────┐
                      │ Cloud Func   │◀──────│    Stripe      │
                      │ handleWebhook│       │   Webhook      │
                      └──────┬───────┘       └────────────────┘
                             │ Firestore更新
                      ┌──────▼───────┐
                      │  billing/    │
                      │ subscription │ status='ACTIVE'
                      └──────────────┘
```

---

## Firestore セキュリティルール

```javascript
match /users/{uid}/billing/{docId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false;
  // 管理者の読み取りは Cloud Functions（Admin SDK）経由で行う
}

match /users/{uid}/limits/{docId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false;
}
```

**Note**: 管理者による他ユーザーの課金ステータス参照は `adminGetUserBillingStatuses` Cloud Function（Admin SDK）経由。Security Rules でのクロスユーザー読み取りは不要。

---

## 既存コレクションとの関係

| Collection | 参照方法 |
| ---------- | -------- |
| `groups/{groupId}` | `ownerUserId == uid AND status == 'active'` でカウント |
| `users/{uid}` | `siteRole` は 106-permission-system で管理（`type SiteRole = 'admin' \| 'tester' \| 'user' \| 'banned'`）。内弟子QR入口で `siteRole: 'tester'` を設定 |

## 初期データ

- **一般ユーザー**: `ensureBillingOnJoin` で自動作成
- **内弟子**: QRリンク経由で `siteRole: 'tester'` + `isUchideshiFree: true` + `status: 'FREE'` を同時設定
- **Stripe**: テスト環境で Product（月額330円税込）と Price を事前作成。Cloud Functions で Stripe SDK を直接利用（Firebase Extension 不使用）
