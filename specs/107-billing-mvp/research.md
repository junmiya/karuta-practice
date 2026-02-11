# Research: 107-billing-mvp

## R-001: 決済事業者の選定

**Decision**: Stripe を採用。

**Rationale**: Web アプリのため Apple/Google IAP は不要。Cloud Functions で Stripe SDK を直接利用し、Checkout Session + Webhook で完全制御可能な連携を実現。手数料 3.6%（日本）は IAP の 15〜30% と比較して圧倒的に安い。日本のクレカ・コンビニ払いにも対応可能（将来拡張）。Firebase Extension（`firestore-stripe-payments`）は不使用（カスタム状態遷移に非対応のため）。

**Alternatives considered**:
- **RevenueCat**: モバイルアプリ向け。Web サポートは新しく制限あり
- **Apple/Google IAP**: Web アプリでは使用不可。ネイティブ化する場合に検討
- **PayPal**: 日本での普及率が低く、サブスク管理が Stripe より弱い

---

## R-002: Stripe 統合方式

**Decision**: Stripe Checkout（ホスト型決済ページ）+ Webhook による自動ステータス更新。

**Rationale**: Checkout Session を使うことで PCI DSS 準拠の決済フォームを自前で作る必要がない。Cloud Function で Session を生成し、URL をフロントエンドに返すだけ。決済完了は Webhook で自動検知。

**Flow**:
```
Frontend → createCheckoutSession (CF) → Stripe API → Checkout URL
User → Stripe Checkout Page → 決済完了
Stripe → Webhook → handleStripeWebhook (CF) → Firestore更新
```

**Customer Portal**: Stripe が提供するホスト型ポータルで、カード変更・解約をユーザー自身が行える。自前 UI 不要。

---

## R-003: 課金データの保存場所

**Decision**: Firestore サブコレクション方式（`/users/{uid}/billing/`, `/users/{uid}/limits/`）。

**Rationale**: ユーザープロファイル（`users/{uid}`）はクライアント書き込み可能だが、課金データはサーバのみ書き込み可。サブコレクションで Security Rules を明確に分離。課金データはマイページでのみ必要。

---

## R-004: ステータス遷移のタイミング

**Decision**: TRIAL → PAST_DUE はクライアント側判定（`now > trialEndsAt`）。ACTIVE/CANCELED は Stripe Webhook で自動更新。

**Rationale**:
- TRIAL → PAST_DUE: DB 上は TRIAL のまま、クライアントが `trialEndsAt` を見て表示判定。Scheduled Function 不要
- PAST_DUE → ACTIVE: Stripe Webhook `invoice.paid` で自動
- ACTIVE → PAST_DUE: Stripe Webhook `invoice.payment_failed` で自動
- ACTIVE → CANCELED: Stripe Webhook `customer.subscription.deleted` で自動

---

## R-005: 内弟子QR入口のトークン方式

**Decision**: 環境変数に固定トークンを1つ設定。

**Rationale**: 内弟子候補は管理者が直接QRを渡す運用。動的生成は過剰。`UCHIDESHI_TOKEN=<ランダム文字列>` を環境変数に設定し、Cloud Function で検証。

**重要**: 内弟子は Stripe Customer を作成しない。`isUchideshiFree=true` で Stripe を完全バイパス。

---

## R-006: PAST_DUE のソフトロック設計

**Decision**: データ削除なし。課金対象機能のみアクセス制限。

| 機能 | 無料 (PAST_DUE可) | 課金対象 |
| ---- | :----------------: | :------: |
| 手習（一人練習） | ✅ | |
| 成績閲覧（歌位） | ✅ | |
| マイページ | ✅ | |
| 稽古（対戦練習） | | ✅ |
| 歌合（大会） | | ✅ |

**フロントエンド**: `BillingGuard` コンポーネントで課金対象ページを保護。

---

## R-007: isUchideshiFree と siteRole の分離

**Decision**: 独立管理。内弟子QR入口で `siteRole: 'tester'` と `isUchideshiFree: true` を同時設定。`tester` は 106-permission-system の既存ロール（`type SiteRole = 'admin' | 'tester' | 'user' | 'banned'`）であり、新しいロール値は追加しない。

**ケース対応**:
1. 内弟子 + 無料 → 通常（QR経由）: `siteRole: 'tester'` + `isUchideshiFree: true`
2. 内弟子卒業 → `siteRole` を `'user'` に変更、`isUchideshiFree` は据え置き可能
3. 特別無料枠 → `isUchideshiFree=true` のみ、`siteRole` は変更しない

---

## R-008: Webhook のセキュリティと冪等性

**Decision**: Stripe Webhook Signing Secret で署名検証。冪等性はイベントIDで保証。

**Implementation**:
- `stripe.webhooks.constructEvent(body, sig, endpointSecret)` で署名検証
- 処理済みイベントID を Firestore に記録し、重複処理を防止
- 関心のあるイベント: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

---

## R-009: Stripe SDK v20 互換性

**Decision**: Stripe SDK v20.3.1 を使用。`new Stripe(key)` でデフォルト API バージョン利用（apiVersion 指定なし）。

**Rationale**: v20 で破壊的変更あり。`Invoice.subscription` → `invoice.parent?.subscription_details?.subscription`、`Subscription.current_period_end` が型から削除（`(sub as any).current_period_end` で回避）。apiVersion を明示すると SDK バージョンと不整合になるリスクあり。

**Alternatives considered**:
- Stripe SDK v17（旧安定版）: 型は安定しているが、新しい Stripe API 機能が使えない
- apiVersion 固定: SDK 内部バージョンと不整合でランタイムエラーのリスク

---

## R-010: 管理者課金操作

**Decision**: AdminPage のユーザータブに内弟子割の適用/解除ボタン + maxGroups 変更を追加。

**Rationale**: 管理者が個別ユーザーの課金ステータスを直接操作できる最小機能。内弟子割はワンクリックトグル、maxGroups は数値設定。全ステータスの直接変更（TRIAL→ACTIVE等）は Stripe 連動が必要なため MVP では対象外。

**Alternatives considered**:
- 全ステータス直接変更: Stripe 側の状態と不整合になるリスク
- Firestore コンソールで直接編集: 操作ミスのリスクが高い
