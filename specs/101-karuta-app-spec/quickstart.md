# Quickstart: 百人一首競技カルタアプリ

**Feature**: 101-karuta-app-spec
**Date**: 2026-01-18

---

## 概要

本ドキュメントは開発環境のセットアップと基本的な動作確認手順を記述する。

---

## 前提条件

- Node.js 18+
- pnpm（パッケージマネージャー）
- Firebase CLI (`npm install -g firebase-tools`)
- Firebaseプロジェクト（Blazeプラン推奨）

---

## 1. リポジトリセットアップ

```bash
# リポジトリクローン（既存の場合はスキップ）
cd /path/to/antigravity_claude

# 依存関係インストール
pnpm install

# Webアプリ依存関係
cd apps/web
pnpm install

# Cloud Functions依存関係
cd ../../functions
pnpm install
```

---

## 2. Firebase設定

### 2.1 Firebase CLIログイン

```bash
firebase login
```

### 2.2 プロジェクト選択

```bash
firebase use <your-project-id>
```

### 2.3 環境変数設定

`apps/web/.env.local`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## 3. ローカル開発サーバー起動

### 3.1 Firebase Emulator起動（推奨）

```bash
# プロジェクトルートから
firebase emulators:start --only auth,firestore,functions
```

Emulator UI: http://localhost:4000

### 3.2 Webアプリ起動

```bash
cd apps/web
pnpm dev
```

アプリ: http://localhost:5173

---

## 4. 動作確認シナリオ

### シナリオ1: 学習タブ（ゲストアクセス）

**目的**: ログインなしで札一覧を表示・操作できることを確認

**手順**:
1. http://localhost:5173 にアクセス
2. 「学習」タブが表示されることを確認
3. 12枚の札がグリッド表示されることを確認
4. 「ひらがな」ボタンをクリック → 表示が切り替わることを確認
5. 「決まり字」フィルタで「1字決まり」を選択 → フィルタされることを確認
6. 「シャッフル」ボタンをクリック → 札が再抽選されることを確認

**期待結果**:
- ゲストユーザーとして全機能が動作
- グリッドは画面の向きに応じて4×3/3×4で表示

---

### シナリオ2: 研鑽タブ（ログイン必須）

**目的**: ログイン後にクイズ練習ができることを確認

**手順**:
1. 「ログイン」ボタンをクリック
2. テストアカウントでログイン
3. 「研鑽」タブをクリック
4. 決まり字数を選択して「開始」
5. 読札が表示されることを確認
6. 取札を選択 → 正解/不正解が表示されることを確認
7. 複数問回答後、結果サマリーを確認

**期待結果**:
- 解答時間がミリ秒単位で計測される
- 正解率・平均解答時間が表示される

---

### シナリオ3: 公式競技セッション（エントリー必須）

**目的**: 公式競技50問を完了し、サーバー確定されることを確認

**前提**: Emulator環境でシーズン・エントリーデータをセットアップ

**手順**:
1. ログイン済み状態で「競技」タブをクリック
2. 「エントリー」ボタンをクリック → 部門選択・同意
3. 「公式競技を開始」をクリック
4. 50問に回答（テスト用に高速回答可）
5. 「提出」ボタンをクリック
6. 確定結果を確認

**期待結果**:
- セッションが「confirmed」または「invalid」になる
- confirmedの場合、スコアが計算される
- 異常検知ルールが適用される（高速すぎる場合はinvalid）

---

### シナリオ4: 成績タブ（番付表示）

**目的**: 個人成績と番付が表示されることを確認

**手順**:
1. ログイン済み状態で「成績」タブをクリック
2. 個人成績セクションを確認
3. 番付セクションを確認
4. 殿堂（過去シーズン上位3名）を確認

**期待結果**:
- 正解率・平均解答時間・決まり字別成績が表示される
- 番付にはニックネームのみ表示される
- 自分のエントリー部門の番付のみ表示される

---

## 5. テストデータセットアップ（Emulator）

### 5.1 シーズンデータ

Firestore Emulator UIで以下を追加:

**Collection**: `seasons`
**Document ID**: `2026_spring`
```json
{
  "seasonId": "2026_spring",
  "name": "2026年春戦",
  "startDate": "2026-02-01T00:00:00+09:00",
  "endDate": "2026-04-30T23:59:59+09:00",
  "status": "active"
}
```

### 5.2 テストユーザー

Auth Emulatorでテストユーザーを作成:
- Email: test@example.com
- Password: test1234

Firestore `users/{uid}`:
```json
{
  "uid": "<test-user-uid>",
  "nickname": "テストユーザー",
  "banzukeConsent": true,
  "rank": "六級",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### 5.3 エントリーデータ

Firestore `entries/{entryId}`:
```json
{
  "entryId": "entry_001",
  "uid": "<test-user-uid>",
  "seasonId": "2026_spring",
  "division": "kyu",
  "consentAt": "2026-01-15T00:00:00Z",
  "createdAt": "2026-01-15T00:00:00Z"
}
```

---

## 6. デプロイ

### 6.1 Cloud Functions

```bash
cd functions
pnpm build
firebase deploy --only functions
```

### 6.2 Firestore Rules & Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 6.3 Webアプリ

```bash
cd apps/web
pnpm build
firebase deploy --only hosting
```

---

## 7. トラブルシューティング

### Q: Emulatorが起動しない

```bash
# ポート競合を確認
lsof -i :8080  # Firestore
lsof -i :9099  # Auth
lsof -i :5001  # Functions

# 別ポートで起動
firebase emulators:start --only auth,firestore,functions --project demo-test
```

### Q: Cloud Functionsがタイムアウトする

- Emulator環境ではコールドスタートが遅い場合あり
- 本番環境では問題なし

### Q: Firestoreの権限エラー

- Security Rulesを確認
- Emulator UIでルール評価をデバッグ

---

## 8. 次のステップ

1. `/speckit.tasks` を実行してタスクリストを生成
2. タスクに従って実装を進める
3. 各User Storyを独立してテスト可能な状態で開発

---

## 関連ドキュメント

- [plan.md](./plan.md) - 実装計画
- [data-model.md](./data-model.md) - データモデル
- [contracts/submitOfficialSession.md](./contracts/submitOfficialSession.md) - Callable Function仕様
