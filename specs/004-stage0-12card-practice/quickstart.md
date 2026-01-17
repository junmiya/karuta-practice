# Quickstart: 段階0 12枚固定練習UI・公式競技・番付

**Date**: 2026-01-18
**Branch**: `004-stage0-12card-practice`

## Prerequisites

- Node.js 18+
- pnpm（パッケージマネージャ）
- Firebase CLI（`npm install -g firebase-tools`）
- Firebase プロジェクト（Blaze プラン有効化済み）

## Setup

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <repository-url>
cd antigravity_claude
pnpm install
```

### 2. Firebase の設定

```bash
# Firebase CLI でログイン
firebase login

# プロジェクトを選択
firebase use karuta-practice-app

# Firebase Emulator をインストール（開発用）
firebase init emulators
```

### 3. 環境変数の設定

```bash
# apps/web/.env.local を作成
cp apps/web/.env.example apps/web/.env.local

# Firebase の設定値を入力
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# etc.
```

### 4. Cloud Functions の設定

```bash
cd functions
npm install

# 開発用の環境変数
cp .env.example .env
```

## Development

### ローカル開発サーバーの起動

```bash
# フロントエンド（apps/web）
cd apps/web
pnpm dev
# → http://localhost:5173

# Firebase Emulator（別ターミナル）
firebase emulators:start
# → Firestore: http://localhost:8080
# → Functions: http://localhost:5001
# → Auth: http://localhost:9099
```

### エミュレータ使用時のフロントエンド設定

```typescript
// apps/web/src/lib/firebase.ts
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

## Quick Validation

### 1. 基本練習UI（P1）

1. http://localhost:5173 にアクセス
2. 「練習を開始する」ボタンをクリック
3. 12枚の取札が4×3グリッドで表示されることを確認
4. 「ひらがな」ボタンで表示が切り替わることを確認
5. 「シャッフル」ボタンで札が再抽選されることを確認

### 2. 公式競技（P2）

1. ログインする（Google or Email）
2. 「競技」タブでシーズンを確認
3. 「エントリー」ボタンで同意してエントリー
4. 「公式競技を開始」で50問開始
5. 全問回答後、結果が「確定」されることを確認

### 3. 番付（P3）

1. 「番付」ページにアクセス
2. 級位の部・段位の部のランキングが表示されることを確認
3. 自分の順位がハイライトされることを確認

## Deployment

### フロントエンドのデプロイ

```bash
cd apps/web
pnpm build
firebase deploy --only hosting
```

### Cloud Functions のデプロイ

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Firestore Security Rules のデプロイ

```bash
firebase deploy --only firestore:rules
```

### 全てをデプロイ

```bash
firebase deploy
```

## Testing

### フロントエンドのテスト

```bash
cd apps/web
pnpm test
```

### Cloud Functions のテスト

```bash
cd functions
npm test
```

### エミュレータでの統合テスト

```bash
# エミュレータを起動してテスト
firebase emulators:exec "npm test"
```

## Project URLs

- **本番サイト**: https://karuta-practice-app.web.app
- **Firebase Console**: https://console.firebase.google.com/project/karuta-practice-app
- **Firestore**: https://console.firebase.google.com/project/karuta-practice-app/firestore

## Troubleshooting

### エミュレータが起動しない

```bash
# ポートが使用中の場合
lsof -i :8080  # Firestore
lsof -i :5001  # Functions
lsof -i :9099  # Auth

# プロセスを終了
kill -9 <PID>
```

### Cloud Functions のデプロイエラー

```bash
# Node.js バージョン確認
node --version  # 18以上が必要

# functions/package.json の engines を確認
"engines": {
  "node": "18"
}
```

### Firestore 権限エラー

- Security Rules が正しくデプロイされているか確認
- Firebase Console で Rules をテスト

## Key Files

| File | Description |
|------|-------------|
| `apps/web/src/pages/PracticePage.tsx` | 練習ページ（12枚UI） |
| `apps/web/src/components/KarutaGrid.tsx` | 4×3グリッドコンポーネント |
| `functions/src/submitOfficialSession.ts` | Callable Function |
| `firestore.rules` | Security Rules |
| `data/poems.seed.json` | 歌データ |
