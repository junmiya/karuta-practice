# Quickstart Guide: Phase 0 - 競技かるた訓練プラットフォーム

**Feature**: Phase 0 Karuta Training Platform
**Date**: 2026-01-17
**Tech Stack**: Vite + React + TypeScript + Tailwind CSS + Firebase

このガイドは、開発者が段階0の開発環境をセットアップし、最初のコードを実行するまでの手順を提供します。

---

## Prerequisites

開発環境に以下がインストールされていることを確認してください：

- **Node.js**: v18以上推奨（LTS版）
  ```bash
  node --version  # v18.0.0以上
  ```

- **npm**: v9以上（Node.jsに同梱）
  ```bash
  npm --version  # v9.0.0以上
  ```

- **Git**: バージョン管理用
  ```bash
  git --version
  ```

- **Firebase CLI**: Firebase Hosting, Firestore操作用
  ```bash
  npm install -g firebase-tools
  firebase --version  # v13.0.0以上推奨
  ```

- **Firebase Account**: [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成済み

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd antigravity_claude
```

### 2. Install Dependencies

```bash
cd apps/web
npm install
```

**Expected dependencies**:
- React 18
- React Router v6
- Tailwind CSS 3.x
- Firebase SDK 10.x
- Vite 5.x
- TypeScript 5.x

### 3. Firebase Project Setup

#### 3.1. Create Firebase Project

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `karuta-training`）
4. Google Analyticsは任意（段階0では不要）
5. プロジェクト作成を完了

#### 3.2. Enable Authentication

1. Firebase Console → 「Authentication」
2. 「始める」をクリック
3. ログイン方法を有効化：
   - **Google**: 有効にする
   - **匿名**: 有効にする

#### 3.3. Create Firestore Database

1. Firebase Console → 「Firestore Database」
2. 「データベースを作成」をクリック
3. **本番環境モード**を選択（Security Rulesは後で設定）
4. ロケーション選択（例: `asia-northeast1`（東京）または`us-central1`）
5. 作成を完了

#### 3.4. Upgrade to Blaze Plan (Optional)

段階0は無料枠内で動作しますが、Firebase Hostingの利用にはBlaze（従量課金）プランが必要です：

1. Firebase Console → 「Upgrade」
2. Blazeプランを選択
3. 予算アラート設定（推奨: ¥1,000/月）

### 4. Get Firebase Configuration

1. Firebase Console → プロジェクト設定（⚙️アイコン）
2. 「マイアプリ」セクションで「ウェブアプリを追加」をクリック
3. アプリのニックネームを入力（例: `karuta-web`）
4. **Firebase Hosting**はチェック不要（後で設定）
5. 「アプリを登録」をクリック
6. 表示される設定値をコピー：

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "karuta-training.firebaseapp.com",
  projectId: "karuta-training",
  storageBucket: "karuta-training.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 5. Environment Variables Setup

#### 5.1. Create `.env` File

```bash
cd apps/web
cp .env.example .env
```

#### 5.2. Fill in Firebase Configuration

```bash
# apps/web/.env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=karuta-training.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=karuta-training
VITE_FIREBASE_STORAGE_BUCKET=karuta-training.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Important**: `.env`は`.gitignore`に含まれており、コミットされません。

### 6. Seed Poems Data

#### 6.1. Get Service Account Key

1. Firebase Console → プロジェクト設定 → サービスアカウント
2. 「新しい秘密鍵を生成」をクリック
3. ダウンロードしたJSONファイルを`scripts/service-account-key.json`に配置

```bash
mv ~/Downloads/karuta-training-*.json scripts/service-account-key.json
```

**Important**: `service-account-key.json`は`.gitignore`に含まれており、コミットされません。

#### 6.2. Run Seed Script

```bash
npm run seed:poems
```

**Expected Output**:
```
✅ Seeded 100 poems successfully.
```

#### 6.3. Verify in Firestore Console

1. Firebase Console → Firestore Database
2. `poems`コレクションに100件のドキュメント（`p001`〜`p100`）が存在することを確認

### 7. Deploy Firestore Security Rules

```bash
cd ../../  # repo root
firebase login
firebase init firestore
# Select existing project: karuta-training
# Use default files: firestore.rules, firestore.indexes.json

firebase deploy --only firestore:rules
```

**Expected Output**:
```
✅ Deploy complete!
```

---

## Development

### Start Development Server

```bash
cd apps/web
npm run dev
```

**Expected Output**:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

ブラウザで http://localhost:5173/ にアクセス

### Project Structure

```text
apps/web/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router setup
│   ├── components/           # Shared components
│   ├── pages/                # Page components
│   ├── services/             # Business logic (Firebase)
│   ├── hooks/                # Custom hooks
│   ├── types/                # TypeScript types
│   └── utils/                # Utilities
├── public/
├── .env                      # Environment variables (gitignored)
└── vite.config.ts            # Vite configuration
```

### Key Development Files

#### Firebase Initialization

```typescript
// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### Fetching Poems

```typescript
// src/services/poems.service.ts
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { Poem } from '../types/poem';

export async function getAllPoems(): Promise<Poem[]> {
  const q = query(collection(db, 'poems'), orderBy('order'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Poem);
}
```

#### Authentication

```typescript
// src/services/auth.service.ts
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signInAnonymous() {
  return await signInAnonymously(auth);
}

export async function signOut() {
  return await firebaseSignOut(auth);
}
```

---

## Testing

### Run Unit Tests (Vitest)

```bash
npm run test
```

### Run E2E Tests (Playwright - Optional)

```bash
npm run test:e2e
```

---

## Build & Deploy

### Build for Production

```bash
npm run build
```

**Output**: `apps/web/dist/`ディレクトリにビルド成果物が生成される

### Preview Production Build Locally

```bash
npm run preview
```

ブラウザで http://localhost:4173/ にアクセス

### Deploy to Firebase Hosting

#### 1. Initialize Firebase Hosting

```bash
cd ../../  # repo root
firebase init hosting
# Select existing project: karuta-training
# Public directory: apps/web/dist
# Single-page app: Yes
# GitHub auto-deploy: No (for now)
```

#### 2. Build & Deploy

```bash
cd apps/web
npm run build

cd ../../  # repo root
firebase deploy --only hosting
```

**Expected Output**:
```
✅ Deploy complete!

Hosting URL: https://karuta-training.web.app
```

---

## Common Tasks

### Add a New Page

1. Create page component: `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:

```typescript
import NewPage from './pages/NewPage';

<Route path="/new" element={<NewPage />} />
```

### Add a New Service

1. Create service file: `src/services/new.service.ts`
2. Import Firebase dependencies
3. Export service functions

### Update Firestore Security Rules

1. Edit `firebase/firestore.rules`
2. Deploy:

```bash
firebase deploy --only firestore:rules
```

### View Firestore Data

Firebase Console → Firestore Database → データタブ

### View Authentication Users

Firebase Console → Authentication → ユーザータブ

---

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"

**Solution**: Firebase Console → Authentication → 設定 → 承認済みドメイン → `localhost`と`127.0.0.1`を追加

### Issue: "Firestore: Missing or insufficient permissions"

**Solution**: Security Rulesを確認。`firebase deploy --only firestore:rules`でデプロイされているか確認。

### Issue: "Module not found: firebase/app"

**Solution**:
```bash
cd apps/web
npm install firebase
```

### Issue: Vite dev server not starting

**Solution**:
```bash
# Clear cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: Environment variables not loading

**Solution**:
1. `.env`ファイルが`apps/web/`直下にあることを確認
2. 全ての環境変数名が`VITE_`プレフィックスで始まっていることを確認
3. Dev serverを再起動（環境変数は起動時に読み込まれる）

---

## Next Steps

1. **Implement User Stories**: `specs/002-phase0-karuta-training/spec.md`を参照
2. **Follow Implementation Plan**: `specs/002-phase0-karuta-training/plan.md`のフェーズに従って実装
3. **Run Tasks**: `/speckit.tasks`コマンドで`tasks.md`を生成し、タスクを実行

---

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com/)

---

## Support

質問がある場合は、プロジェクトのREADME.mdまたはチームチャンネルを参照してください。
