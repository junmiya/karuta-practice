# Feature Specification: Phase 0 - Foundation Infrastructure

**Feature Branch**: `001-phase0-foundation`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "段階0: Firebase基盤構築、TopページとBasicページの実装、poems表示機能"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Top Page and Navigate to Basic Page (Priority: P1)

ユーザーはトップページを訪問し、サービス内容を確認して、基本機能（Basicページ）へ遷移できる。

**Why this priority**: トップページは最初のエントリーポイントであり、ユーザーがサービスを理解し、機能へアクセスするための必須の導線。

**Independent Test**: ブラウザでルートURL（`/`）にアクセスし、「基本へ」ボタンをクリックして `/basic` へ遷移することで、完全に独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** ユーザーがトップページ（`/`）にアクセスする、**When** ページが読み込まれる、**Then** サービス名と短い説明文、「基本へ」ボタンが表示される
2. **Given** トップページが表示されている、**When** 「基本へ」ボタンをクリックする、**Then** `/basic` ページへ遷移する
3. **Given** ユーザーが `/basic` ページに直接アクセスする、**When** ページが読み込まれる、**Then** Basicページが正常に表示される（SPAリライト機能の確認）

---

### User Story 2 - View Poem Cards on Basic Page (Priority: P2)

ユーザーはBasicページで百人一首の読札（上の句）を番号順に一覧表示できる。

**Why this priority**: 段階0の核心機能であり、Firestore連携とデータ表示の基盤となる。トップページの導線が確立した後に実装することで、段階的な価値提供が可能。

**Independent Test**: Firestoreに100件のpoemsデータが投入されている状態で `/basic` にアクセスし、すべてのカードが order 昇順で表示されることで独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** Firestoreに100件のpoemsが投入されている、**When** Basicページ（`/basic`）にアクセスする、**Then** すべてのpoemsが order（1..100）昇順でカード表示される
2. **Given** Basicページが読み込まれている、**When** 各カードを確認する、**Then** 各カードに `order`（番号）と `kami`（読札：上の句）が表示されている
3. **Given** Firestoreからのデータ取得中、**When** ページが読み込み中の状態、**Then** 「読み込み中」状態が表示される
4. **Given** Firestoreからのデータ取得に失敗した、**When** エラーが発生する、**Then** エラーメッセージが表示される
5. **Given** Firestoreにpoemsが0件の状態、**When** Basicページにアクセスする、**Then** 「0件（未投入）」メッセージが表示される

---

### User Story 3 - Seed Poems Data (Priority: P3)

開発者またはシステム管理者は、コマンドを実行してFirestoreに100件の百人一首データを投入できる。

**Why this priority**: データ投入はアプリケーション機能の前提条件だが、エンドユーザー向け機能ではないため優先度はP3。User Story 2の前提として必要。

**Independent Test**: `npm run seed:poems` コマンドを実行し、Firestoreに100件のpoemsが投入され、コンソールに件数がログ表示されることで独立してテスト可能。

**Acceptance Scenarios**:

1. **Given** Firestoreが空の状態、**When** `npm run seed:poems` を実行する、**Then** 100件のpoemsがFirestoreに投入される
2. **Given** Firestoreに既存のpoemsがある、**When** `npm run seed:poems` を再実行する、**Then** 同じpoemIdのデータは上書き（upsert）され、重複しない
3. **Given** seedスクリプトが完了した、**When** 処理が終了する、**Then** コンソールに投入された件数（100件）がログ表示される

---

### Edge Cases

- **Firestore接続失敗**: ネットワークエラーやFirebase設定エラーにより接続できない場合、Basicページでエラーメッセージを表示する
- **不正なデータ構造**: poemsドキュメントに `order` または `kami` フィールドが欠けている場合、該当カードをスキップまたはエラー表示する
- **空のデータセット**: Firestoreに1件もpoemsが存在しない場合、「0件（未投入）」メッセージを表示する
- **環境変数未設定**: Firebase設定用の環境変数（`.env`）が設定されていない場合、アプリケーション起動時にエラーを表示する
- **直接URL アクセス**: `/basic` に直接アクセスした場合でもSPAリライトにより正常に表示される

## Requirements *(mandatory)*

### Functional Requirements

#### Pages & Navigation
- **FR-001**: システムはトップページ（`/`）を提供し、サービス名、短い説明文、「基本へ」ボタンを表示しなければならない
- **FR-002**: トップページの「基本へ」ボタンをクリックすると `/basic` へ遷移しなければならない
- **FR-003**: システムはBasicページ（`/basic`）を提供し、百人一首のカード一覧を表示しなければならない

#### Data Display
- **FR-004**: Basicページはデータストアから `poems` を取得し、`order` フィールド昇順でカード表示しなければならない
- **FR-005**: 各poemカードは `order`（番号）と `kami`（読札：上の句）を表示しなければならない
- **FR-006**: Basicページはデータ取得中に「読み込み中」状態を表示しなければならない
- **FR-007**: Basicページはデータ取得エラー時に「エラー（取得失敗）」メッセージを表示しなければならない
- **FR-008**: Basicページはpoemsが0件の場合に「0件（未投入）」メッセージを表示しなければならない

#### Data Structure
- **FR-009**: `poems` コレクションの各ドキュメントは以下のフィールドを持たなければならない：
  - `order: number`（1..100）
  - `kami: string`（読札：上の句）
  - `shimo: string`（取札：下の句）
  - `kimarijiCount: number`（決まり字数：1..6）
- **FR-010**: 段階0では `kami` と `order` のみを表示し、他のフィールド（`shimo`, `kimarijiCount`）はデータストアに保存のみ行う

#### Data Seeding
- **FR-011**: システムは `npm run seed:poems` コマンドを提供し、100件のpoemsをデータストアに投入しなければならない
- **FR-012**: Seedスクリプトは同じpoemIdのデータを上書き（upsert）しなければならない
- **FR-013**: Seedスクリプトは投入完了後にコンソールへ投入件数をログ表示しなければならない
- **FR-014**: Seedデータは `data/poems.seed.json` ファイルに100件の百人一首データを含まなければならない

#### Configuration & Security
- **FR-015**: データストア接続設定は環境変数から読み込まなければならない（コード内に直書きしない）
- **FR-016**: システムは `.env.example` ファイルを提供し、必要な環境変数を明示しなければならない
- **FR-017**: データストアのアクセス権限は以下のルールに従わなければならない：
  - `poems` コレクション：読み取り許可、書き込み禁止
  - その他のコレクション：読み取り・書き込み禁止

#### Deployment & DevEx
- **FR-018**: システムはSPA（Single Page Application）としてホスティングされ、すべてのURLリクエストを `/index.html` にリライトしなければならない
- **FR-019**: システムは以下のnpmスクリプトを提供しなければならない：
  - `npm run dev`（開発サーバー起動）
  - `npm run build`（本番ビルド）
  - `npm run preview`（ビルドのプレビュー）
  - `npm run lint`（コード検証）
  - `npm run format`（コード整形）
  - `npm run seed:poems`（データ投入）
- **FR-020**: システムはコード品質ツール（リンター、フォーマッター）を導入しなければならない
- **FR-021**: READMEは以下の内容を含まなければならない：
  - プロジェクトのセットアップ手順（`npm i` から `npm run dev` まで）
  - 環境変数の設定方法
  - Seedデータ投入方法
  - デプロイ手順

### Key Entities

- **Poem**: 百人一首の1首を表すデータ。以下の属性を持つ：
  - `poemId`: 各poemを一意に識別するID
  - `order`: 百人一首における番号（1から100）
  - `kami`: 読札（上の句）のテキスト
  - `shimo`: 取札（下の句）のテキスト
  - `kimarijiCount`: 決まり字の数（1から6）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 開発者は `npm i` から `npm run dev` までのコマンドを実行することで、5分以内にローカル環境でTop/Basicページを動作確認できる
- **SC-002**: `npm run seed:poems` コマンドを実行することで、30秒以内に100件のpoemsがデータストアに投入される
- **SC-003**: Basicページは100件のpoemsを3秒以内に表示する
- **SC-004**: すべてのpoemsは `order` 1から100まで昇順で正しく表示される（欠番や順序の乱れがない）
- **SC-005**: `npm run build` が成功し、ビルド成果物がホスティング環境にデプロイ可能である
- **SC-006**: ホスティングURLでトップページが表示され、Basicページへの遷移が動作する
- **SC-007**: `/basic` URLに直接アクセスしても正常にBasicページが表示される（SPAリライトの確認）
- **SC-008**: READMEの手順に従うことで、第三者が環境を再現できる（セットアップから動作確認まで）
- **SC-009**: データ取得エラー時に、ユーザーは「エラー（取得失敗）」メッセージを確認できる
- **SC-010**: poemsが0件の状態でBasicページにアクセスすると、「0件（未投入）」メッセージが表示される

## Assumptions

- Firebaseプロジェクトは既に作成されており、プロジェクトIDとAPI keyが利用可能である
- 開発環境にはNode.js（v18以上推奨）とnpmがインストールされている
- 百人一首データ（100首）の正確なテキストは `data/poems.seed.json` に事前に準備されている
- デプロイ先ホスティングサービスはFirebase Hostingを使用する
- UIデザインは最小限で良く、段階0では機能実装を優先する（レスポンシブ対応は必須）
- 段階0では認証機能は不要（すべてのユーザーがpoemsを閲覧可能）
- パフォーマンス目標は一般的なWebアプリケーションの基準（3秒以内のページ表示）を想定
