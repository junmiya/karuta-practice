# Feature Specification: 課金MVP（Stripe連携・内弟子入口・団体上限）

**Feature Branch**: `107-billing-mvp`
**Created**: 2026-02-11
**Status**: Draft
**Input**: 個人課金の状態管理、Stripe月額決済（月額330円税込）、30日無料トライアル、内弟子割（永年無料）、団体作成上限制御、内弟子QR入口

## Clarifications

### Session 2026-02-11

- Q: 月額300円の精算方式は？ → A: Stripe によるオンライン決済
- Q: 3団体目以降は？ → A: 管理者へ連絡（maxGroups引き上げ対応）
- Q: siteRole と課金免除の関係は？ → A: 分離。`siteRole: 'tester'` はベータ機能アクセス（106-permission-system の既存ロール）、`isUchideshiFree` は課金免除。両方独立
- Q: TRIAL期限切れ後は？ → A: PAST_DUE（ソフトロック）。成績データ保持、課金対象機能のみ不可
- Q: 内弟子の入会方法は？ → A: 専用QRリンク（トークン付き）から課金なし入会。MVPに含める
- Q: 決済事業者は？ → A: Stripe。Web アプリのためIAP不要、Firebase公式Extension あり、手数料3.6%
- Q: 3団体目以降の案内文は？ → A: 「ご連絡ください」のみ
- Q: Stripe連携方式は？ → A: Cloud Functions で Stripe SDK を直接利用（Firebase Extension不使用）
- Q: ユーザー向け金額表記は？ → A: 「月額330円（税込）」に統一
- Q: 管理者の課金操作権限は？ → A: 内弟子割の適用/解除 + maxGroups変更（実装済み範囲）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 新規ユーザーが入会してトライアルを開始する (Priority: P1)

新規ユーザーがGoogle認証でログイン後、自動的に30日間の無料トライアルが開始される。マイページで残日数を確認できる。

**Acceptance Scenarios**:

1. **Given** 初回ログインのユーザー, **When** Google認証を完了, **Then** `billing/subscription` が作成され `status: TRIAL`, `joinedAt`, `trialEndsAt`（+30日）がサーバ付与される
2. **Given** TRIALのユーザー, **When** マイページを表示, **Then** 「お試し期間：残りN日」「月額330円（税込）」表示
3. **Given** TRIALのユーザー, **When** 稽古・歌合にアクセス, **Then** 通常通り利用できる

---

### User Story 2 - トライアル期限切れで入門画面→Stripe決済 (Priority: P1)

トライアル30日を過ぎたユーザーがログインすると「入門するか確認」画面が表示される。「入門する」ボタンで Stripe Checkout に遷移し、決済完了で ACTIVE になる。

**Acceptance Scenarios**:

1. **Given** TRIAL期限切れのユーザー, **When** 課金対象ページにアクセス, **Then** 入門画面が表示される
2. **Given** 入門画面で「入門する」を押下, **When** Stripe Checkout で決済完了, **Then** Webhook で `status: ACTIVE` に自動更新、稽古等が利用可能に
3. **Given** Stripe Checkout で決済を中断, **When** 戻る, **Then** PAST_DUE のまま、入門画面に戻る
4. **Given** PAST_DUEのユーザー, **When** 手習（無料機能）にアクセス, **Then** 通常通り利用できる
5. **Given** PAST_DUEのユーザー, **When** 成績ページにアクセス, **Then** トライアル中の成績が閲覧できる

---

### User Story 3 - 内弟子がQRリンクから課金なしで入会する (Priority: P1)

管理者から受け取った専用QRリンクをスキャンし、Google認証後、課金なし（永年無料）で全機能を利用できる。Stripe決済を一切経験しない。

**Acceptance Scenarios**:

1. **Given** 管理者が配布した内弟子リンク, **When** 新規ユーザーがアクセスしてログイン, **Then** `siteRole: 'tester'`, `isUchideshiFree: true`, `status: FREE` が設定される
2. **Given** FREEの内弟子ユーザー, **When** マイページを表示, **Then** 「内弟子割（永年無料）」と表示
3. **Given** 無効なトークン, **When** アクセス, **Then** エラー表示＋通常入会導線

---

### User Story 4 - ACTIVEユーザーが解約/更新失敗する (Priority: P2)

ACTIVEユーザーが Stripe Customer Portal から解約、またはカード更新失敗で PAST_DUE/CANCELED になる。

**Acceptance Scenarios**:

1. **Given** ACTIVEユーザー, **When** Customer Portal で解約, **Then** Webhook で `status: CANCELED`、期間終了後に機能制限
2. **Given** ACTIVEユーザー, **When** カード決済失敗, **Then** Webhook で `status: PAST_DUE`、入門画面表示
3. **Given** CANCELEDユーザー, **When** 再入門（再度Stripe Checkout）, **Then** ACTIVE に復帰

---

### User Story 5 - マイページで課金情報を確認する (Priority: P2)

**Acceptance Scenarios**:

1. **Given** TRIALのユーザー, **When** マイページ, **Then** 「お試し期間：残りN日」「月額330円（税込）」表示
2. **Given** FREEのユーザー, **When** マイページ, **Then** 「内弟子割（永年無料）」表示
3. **Given** ACTIVEのユーザー, **When** マイページ, **Then** 「入門済み」「月額330円（税込）」「カード管理」リンク（Customer Portal）
4. **Given** PAST_DUEのユーザー, **When** マイページ, **Then** 「入門して続ける」CTA

---

### User Story 6 - 団体を2つまで作成できる (Priority: P2)

**Acceptance Scenarios**:

1. **Given** active団体0のユーザー, **When** 団体作成, **Then** 成功
2. **Given** active団体2のユーザー, **When** 団体作成, **Then** 拒否「ご連絡ください」
3. **Given** 管理者がmaxGroupsを3に引き上げ, **When** 団体作成, **Then** 3つ目も成功

---

### Edge Cases

- 既存ユーザー（`billing/subscription` なし）がログイン → `ensureBillingOnJoin` で初期化
- 内弟子が通常リンクで再ログイン → 既に `isUchideshiFree: true` なので FREE のまま
- Stripe Webhook が遅延した場合 → クライアントは polling or 再読み込みで最新状態を取得
- Webhook の重複呼び出し → 冪等性を保証（同じイベントIDは無視）
- `suspended` / `deleted` の団体は作成数カウント対象外

## Requirements *(mandatory)*

### Functional Requirements

**課金状態管理**

- **FR-001**: 初回ログイン時に `ensureBillingOnJoin(uid)` でサーバ付与（`joinedAt`, `trialEndsAt`）
- **FR-002**: ステータス優先順位: `isUchideshiFree=true` → FREE、Stripe subscription 状態 → ACTIVE/PAST_DUE/CANCELED、`now < trialEndsAt` → TRIAL、それ以外 → PAST_DUE

**Stripe 連携**

- **FR-003**: 入門時に Stripe Checkout Session を生成し、決済ページに遷移する（月額330円税込）
- **FR-004**: Stripe Webhook で `invoice.paid` → ACTIVE、`invoice.payment_failed` → PAST_DUE、`customer.subscription.deleted` → CANCELED を自動反映
- **FR-005**: Stripe Customer Portal へのリンクを提供（カード変更・解約）
- **FR-006**: Stripe Customer は Firebase UID と紐付け（`stripeCustomerId`）

**PAST_DUE（ソフトロック）**

- **FR-007**: PAST_DUE ユーザーは無料機能（手習）を利用可能
- **FR-008**: PAST_DUE ユーザーの課金対象機能（稽古・歌合）は利用不可、入門画面にリダイレクト
- **FR-009**: PAST_DUE ユーザーの過去の成績データは保持・閲覧可能

**内弟子入口**

- **FR-010**: 内弟子専用URL（`/join/uchideshi?token=<secret>`）で課金なし入会
- **FR-011**: トークンは環境変数（固定値）。`siteRole: 'tester'` + `isUchideshiFree: true` 同時設定（`tester` は 106-permission-system の既存ロール `type SiteRole = 'admin' | 'tester' | 'user' | 'banned'`）
- **FR-012**: 無効トークンはエラー表示＋通常入会導線

**マイページ課金表示**

- **FR-013**: ステータス別の課金情報表示（残日数/内弟子割/入門済み/CTA）。価格は総額表示（330円税込）
- **FR-014**: ACTIVE ユーザーに Stripe Customer Portal リンク

**団体作成上限**

- **FR-015**: `maxGroups`（デフォルト2）を超える団体作成は拒否
- **FR-016**: カウント対象は `status: 'active'` の団体のみ
- **FR-017**: 上限超過時の案内: 「ご連絡ください」

**セキュリティ**

- **FR-018**: `billing/**` と `limits/**` はクライアント書き込み禁止
- **FR-019**: Stripe Webhook は署名検証必須（`stripe-signature` ヘッダ）

**管理者課金ビュー**

- **FR-020**: 管理者（AdminPage.tsx のユーザータブ）がユーザー一覧で課金ステータス（FREE/TRIAL/ACTIVE/CANCELED/PAST_DUE）、trialEndsAt、isUchideshiFree を確認できる
- **FR-021**: 管理者がユーザーの内弟子割（`isUchideshiFree`）を適用/解除できる。適用時は `status: FREE` に自動変更
- **FR-022**: 管理者がユーザーの団体作成上限（`maxGroups`）を変更できる

### Key Entities

- **Subscription**: 課金契約状態 + Stripe連携ID
- **Entitlement**: 課金特典（`isUchideshiFree`）
- **GroupCreationLimit**: 団体作成上限（`maxGroups`）

## Scope *(mandatory)*

### In Scope

- Stripe Checkout による月額330円（税込）サブスクリプション
- Stripe Webhook による自動ステータス更新
- Stripe Customer Portal リンク（カード管理・解約）
- 30日無料トライアル + PAST_DUE ソフトロック（成績保持）
- 内弟子専用QR入口（固定トークン方式）
- マイページ課金情報表示
- 団体作成上限（maxGroups = 2）+ 「ご連絡ください」
- 管理者向け課金ステータスビュー・操作（AdminPage ユーザータブ拡張：閲覧・内弟子割切替・maxGroups変更）
- Firestore Security Rules

### Out of Scope

- クーポンコード入力（割合割引/期間割引/学校クーポン）
- 返金、日割り、税計算等の会計仕様
- 3団体目以降の自動決済（管理者連絡による手動対応）
- QRコード生成UI（スマホ標準機能を使用）
- 内弟子招待の動的トークン生成
- コンビニ払い等の追加決済手段（Stripe拡張で将来対応可能）
- Stripe の本番環境申請手続き（別タスク）

## Assumptions

- Stripe アカウントが作成済み（テスト環境利用可能）
- Cloud Functions で Stripe SDK を直接利用（Firebase Extension `firestore-stripe-payments` は不使用）
- 基本料金は月額330円税込（Stripe Price ID として事前設定）
- Stripe Checkout はホスト型（自前フォーム不要）
- 価格は月額330円（税込）。Stripe Price に税込価格として設定
- Webhook エンドポイントは Cloud Functions（HTTP Function）で受信

## Dependencies

- 106-permission-system（`siteRole` 基盤）
- Stripe アカウント + API キー（`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`）
- 既存の認証基盤（Firebase Auth + `useAuth` + `AuthContext`）
- 既存の団体作成フロー（`groupService.ts`）

## Success Criteria *(mandatory)*

- **SC-001**: 新規ユーザーのログインで TRIAL が自動設定される
- **SC-002**: PAST_DUE → 入門 → Stripe 決済 → ACTIVE が自動で完了する
- **SC-003**: 内弟子QRリンク経由で入会したユーザーは決済画面を一切見ない
- **SC-004**: PAST_DUEユーザーの過去成績が100%保持される
- **SC-005**: Stripe Webhook でステータスが自動更新される
- **SC-006**: 1人2団体まで作成でき、3つ目は拒否される
- **SC-007**: 管理者がAdminPageのユーザータブで全ユーザーの課金ステータスを確認・変更できる（内弟子割の適用/解除、maxGroups変更）
