# Feature Specification: 権限システム整理（siteRole導入・管理者ガード・ユーザー管理）

**Feature Branch**: `106-permission-system`
**Created**: 2026-02-11
**Status**: Draft
**Input**: 管理者権限を環境変数ベースからFirestoreベースに移行し、テスター権限を新設、フロントエンドに管理者ガードを追加する

## Clarifications

### Session 2026-02-11

- Q: システム全体の管理権限は自分だけでよいか？ → A: はい。`admin` はオーナー1名のみ。
- Q: `moderator` ロールは必要か？ → A: 現時点では不要。需要が出た段階で追加可能。
- Q: 内弟子権限の管理方法は？ → A: 管理者ダッシュボードの「ユーザー管理」タブで付与・剥奪。
- Q: 結びの管理者ロール（owner/organizer/member）との関係は？ → A: 独立した2層モデル。siteRoleはグローバル、結びロールは団体スコープ。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 管理者がダッシュボードにアクセスする (Priority: P1)

管理者（`siteRole: 'admin'`）がログイン後、`/admin` にアクセスし、管理ダッシュボードを利用できる。非管理者はURL直打ちでもアクセスできない。

**Why this priority**: 現在は認証済みなら誰でも `/admin` にアクセスできるセキュリティ上の問題を解消するため。

**Independent Test**: admin ロールのユーザーでログインし `/admin` にアクセス → ダッシュボード表示。別ユーザーでログインし `/admin` → ホームにリダイレクト。

**Acceptance Scenarios**:

1. **Given** `siteRole: 'admin'` のユーザーがログイン済み, **When** `/admin` にアクセス, **Then** 管理ダッシュボードが表示される
2. **Given** `siteRole` 未設定（一般ユーザー）がログイン済み, **When** `/admin` にアクセス, **Then** ホーム（`/`）にリダイレクトされる
3. **Given** `siteRole: 'uchideshi'` のユーザーがログイン済み, **When** `/admin` にアクセス, **Then** ホーム（`/`）にリダイレクトされる
4. **Given** 未ログインユーザー, **When** `/admin` にアクセス, **Then** ホーム（`/`）にリダイレクトされる

---

### User Story 2 - 内弟子が未公開機能にアクセスする (Priority: P2)

内弟子（`siteRole: 'uchideshi'`）がログイン後、ベータ機能（Feature Flagで制御）にアクセスできる。一般ユーザーにはベータ機能が表示されない。

**Why this priority**: 新機能のテスト運用に必要だが、adminガード追加の方が先。

**Independent Test**: uchideshi ロールのユーザーでログインし、ベータ機能が表示されることを確認。一般ユーザーでは非表示。

**Acceptance Scenarios**:

1. **Given** `siteRole: 'uchideshi'` のユーザーがログイン済み, **When** ベータ機能のあるページにアクセス, **Then** ベータ機能が表示される
2. **Given** `siteRole: 'admin'` のユーザーがログイン済み, **When** 同ページにアクセス, **Then** ベータ機能が表示される（adminは内弟子権限を包含）
3. **Given** 一般ユーザーがログイン済み, **When** 同ページにアクセス, **Then** ベータ機能は表示されない

---

### User Story 3 - 管理者がユーザーの権限を変更する (Priority: P2)

管理者がダッシュボードの「ユーザー管理」タブで、対象ユーザーを検索し、`siteRole` を `uchideshi` に変更する。変更は即時反映され、監査ログに記録される。

**Why this priority**: 内弟子権限のライフサイクル管理に必要。

**Independent Test**: 管理者でログイン → ユーザー管理タブ → 対象ユーザーを検索 → siteRoleを変更 → 対象ユーザーで再ログインして権限反映を確認。

**Acceptance Scenarios**:

1. **Given** 管理者がユーザー管理タブを表示, **When** ニックネームで検索, **Then** 該当ユーザーの一覧が表示される
2. **Given** 管理者がユーザー管理タブを表示, **When** siteRoleフィルタで「内弟子」を選択, **Then** 内弟子ロールのユーザーのみ表示される
3. **Given** ユーザー一覧で対象ユーザーを特定, **When** siteRoleドロップダウンで「内弟子」を選択して確定, **Then** `siteRole` が更新され成功通知が表示される
4. **Given** 非管理者ユーザー, **When** `adminSetUserRole` Cloud Functionを直接呼び出し, **Then** `permission-denied` エラーが返される

---

### Edge Cases

- `siteRole` フィールドが存在しないユーザー → `'user'`（デフォルト）として扱う
- 管理者が自分自身の `siteRole` を変更しようとした場合 → エラー（自己降格を防止）
- `banned` ユーザーのログイン → MVP では機能制限なし（将来対応）
- エミュレータ環境 → 全ユーザーを admin 扱い（開発時の利便性維持）

## Requirements *(mandatory)*

### Functional Requirements

**権限データモデル**

- **FR-001**: `User` 型に `siteRole` フィールド（`'admin' | 'uchideshi' | 'user' | 'banned'`）を追加する。未設定は `'user'` 扱い
- **FR-002**: `siteRole` の変更はバックエンド（Admin SDK）のみ許可。Firestoreセキュリティルールでクライアント側からの `siteRole` 書き込みを禁止する

**バックエンド権限チェック**

- **FR-003**: `isAdmin` / `requireAdmin` を共通ユーティリティ（`lib/adminAuth.ts`）に集約する
- **FR-004**: 移行期間中は `ADMIN_UIDS` 環境変数と Firestore `siteRole` の両方をチェックする
- **FR-005**: エミュレータ環境（`FUNCTIONS_EMULATOR`）では全ユーザーを admin 扱いにする（開発時互換）

**フロントエンドガード**

- **FR-006**: `AuthContext` に `siteRole` / `isAdmin` / `isUchideshi` を追加する
- **FR-007**: `AdminRoute` ガードコンポーネントを作成し、`/admin` を保護する
- **FR-008**: 非管理者が `/admin` にアクセスした場合、ホーム（`/`）にリダイレクトする

**ユーザー管理**

- **FR-009**: `adminGetUsers` Cloud Function — ユーザー一覧取得（siteRole・ニックネームでフィルタ可）
- **FR-010**: `adminSetUserRole` Cloud Function — siteRole 変更（admin 限定、自己変更禁止、監査ログ記録）
- **FR-011**: 管理ダッシュボードに「ユーザー管理」タブを追加する

**レガシー削除**

- **FR-012**: `adminFunctions.ts`（V1、未使用）を削除する

### Key Entities

- **SiteRole**: ユーザーのグローバル権限レベル。`'admin'`（システム管理者）、`'uchideshi'`（内弟子・ベータ機能アクセス）、`'user'`（一般、デフォルト）、`'banned'`（制限、将来用）
- **GroupRole**: 団体内ロール。`'owner'`、`'organizer'`、`'member'`。SiteRoleとは独立

## Scope *(mandatory)*

### In Scope

- `User` 型に `siteRole` フィールド追加
- `lib/adminAuth.ts` に権限チェックを集約
- `adminFunctionsV2.ts` のローカル `isAdmin`/`requireAdmin` を共通ユーティリティに置き換え
- `adminFunctions.ts`（V1）の削除
- `firestore.rules` の `siteRole` 書き込み保護
- `AuthContext` / `useAuth` に `siteRole` 関連プロパティ追加
- `AdminRoute` ガードコンポーネント作成
- `adminGetUsers` / `adminSetUserRole` Cloud Functions
- 管理ダッシュボードの「ユーザー管理」タブ

### Out of Scope

- `banned` ユーザーのログインブロック（将来対応）
- 追加ロールの新設（需要発生時に対応）
- Firebase Custom Claims への移行（中期的検討事項）
- `ADMIN_UIDS` 環境変数の完全廃止（siteRole安定稼働後に実施）
- 結びロール（owner/organizer/member）の変更
- ユーザー管理タブの高度なUI（ページング、ソート等はMVP後）

## Assumptions

- `users` コレクションの既存ドキュメントには `siteRole` フィールドがない → デフォルト `'user'`
- 管理者のUID に `siteRole: 'admin'` を Firebase Console から手動設定することで初期化する
- `AdminRoute` は既存の `ProtectedRoute` と同じパターンで実装可能
- `useAuth` フックのプロファイル読み込み時に `siteRole` も取得可能（追加コストなし）

## Dependencies

- 既存の認証基盤（Firebase Auth + `useAuth` フック + `AuthContext`）
- 既存の `ProtectedRoute` パターン
- 既存の `admin-v2.service.ts`（Cloud Functions ラッパー）
- 既存の `adminFunctionsV2.ts`（V2管理関数）
- Firestore `users` コレクション

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 非管理者が `/admin` にアクセスした場合、100%の確率でホームにリダイレクトされる
- **SC-002**: `siteRole: 'admin'` のユーザーのみが管理ダッシュボードにアクセスできる
- **SC-003**: 管理者がユーザー管理タブで siteRole を変更でき（例: 内弟子への昇格）、次回ログイン時に反映される
- **SC-004**: `adminFunctions.ts`（V1）が完全に削除され、ビルドエラーなし
- **SC-005**: エミュレータ環境での開発フローが維持される（全ユーザーadmin扱い）
