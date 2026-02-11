---
name: testing-procedures
description: 機能別テスト手順。ユニットテスト、統合テスト、ブラウザテストの実行方法
---

# Testing Procedures Skill

機能別テスト手順のスキルです。

## テストの種類

| 種類 | 対象 | ツール |
|------|------|--------|
| TypeScript型チェック | 全体 | `tsc --noEmit` |
| ブラウザテスト | UI | 手動 / ブラウザツール |
| エミュレータテスト | Functions + Firestore | Firebase Emulator |

## 基本チェック

### TypeScriptビルド確認

```bash
# フロントエンド
cd apps/web && npx tsc --noEmit

# バックエンド
cd functions && npx tsc --noEmit
```

### ESLintチェック

```bash
cd apps/web && npm run lint
cd functions && npm run lint
```

---

## 機能別テスト

### 1. 認証機能

**対象ファイル:**
- `apps/web/src/hooks/useAuth.tsx`
- `apps/web/src/pages/ProfilePage.tsx`

**テスト手順:**
1. `/profile` にアクセス
2. Googleログインボタンをクリック
3. ログイン後、ユーザー情報が表示されることを確認
4. ログアウトボタンをクリック
5. ログアウト後、ログイン画面に戻ることを確認

---

### 2. エントリー機能

**対象ファイル:**
- `apps/web/src/pages/EntryPage.tsx`
- `apps/web/src/services/entry.service.ts`

**テスト手順:**
1. ログイン状態で `/entry` にアクセス
2. シーズン情報が表示されることを確認
3. 級の部/段の部を選択
4. 同意チェックを入れてエントリーボタンをクリック
5. `/official` にリダイレクトされることを確認

**エラーケース:**
- 未ログイン時: ログイン促進メッセージ表示
- シーズンなし: 管理者連絡メッセージ表示
- 凍結中: エントリー不可メッセージ表示

---

### 3. 公式歌合（対戦）

**対象ファイル:**
- `apps/web/src/pages/OfficialPage.tsx`
- `apps/web/src/services/stage1.service.ts`

**テスト手順:**
1. エントリー済みユーザーで `/official` にアクセス
2. 対戦開始ボタンをクリック
3. 問題が表示されることを確認
4. 回答後、スコアが記録されることを確認
5. 結果画面が表示されることを確認

---

### 4. 管理者機能

**対象ファイル:**
- `apps/web/src/pages/AdminPage.tsx`
- `apps/web/src/services/admin-v2.service.ts`
- `functions/src/adminFunctionsV2.ts`

**テスト手順:**

#### 節気カレンダー
1. `/admin` にアクセス
2. 「節気カレンダー」タブを選択
3. 年を選択して「読み込み」ボタンをクリック
4. カレンダー情報が表示されることを確認
5. 「2026年デフォルト投入」で初期データ投入

#### ルールセット
1. 「ルールセット」タブを選択
2. 「現在のルールセットを読み込み」ボタンをクリック
3. ルールセット情報が表示されることを確認

#### 確定パイプライン
1. 「確定パイプライン」タブを選択
2. シーズンキーが自動入力されることを確認
3. スナップショット状態が表示されることを確認
4. Freeze/Finalize/Publishボタンの動作確認

---

### 5. 級位認定試験

**対象ファイル:**
- `apps/web/src/pages/KyuiExamPage.tsx`
- `functions/src/kyuiExamFunction.ts`

**テスト手順:**
1. `/kyui-exam` にアクセス
2. 受験する級を選択
3. 試験開始ボタンをクリック
4. 問題に回答
5. 合否結果が表示されることを確認

---

## エミュレータでのテスト

```bash
# エミュレータ起動
firebase emulators:start

# テスト用URL
http://localhost:5000  # Hosting
http://localhost:4000  # Emulator UI
```

## 本番環境での確認

1. `firebase deploy` でデプロイ
2. 本番URLにアクセス
3. 各機能の動作確認
4. Firebase Console でログ確認
