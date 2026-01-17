# Quickstart Guide: Phase 0 - Foundation Infrastructure

**Date**: 2026-01-17
**Feature**: Phase 0 - Foundation Infrastructure
**Estimated Setup Time**: 15-20 minutes

## Prerequisites

開始する前に、以下がインストールされていることを確認してください：

- **Node.js**: v18.x 以上（推奨: v20.x LTS）
  - 確認: `node --version`
- **npm**: v9.x 以上
  - 確認: `npm --version`
- **Firebase CLI**: v12.x 以上
  - インストール: `npm install -g firebase-tools`
  - 確認: `firebase --version`
- **Git**: v2.x 以上
  - 確認: `git --version`

## Firebase Project Setup

### 1. Firebaseプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `hyakunin-isshu-phase0`）
4. Google Analyticsの有効化（任意、段階0では不要）
5. プロジェクトを作成

### 2. Firestore Databaseを有効化

1. Firebase Console で左メニューから「Firestore Database」を選択
2. 「データベースを作成」をクリック
3. **本番モード**を選択（Security Rulesは後で設定）
4. ロケーションを選択（推奨: `asia-northeast1` - 東京）
5. 「有効にする」をクリック

### 3. Firebaseアプリを登録

1. Firebase Console で「プロジェクトの設定」（歯車アイコン）を選択
2. 「アプリを追加」 → 「ウェブ」を選択
3. アプリのニックネームを入力（例: `Web App`）
4. **Firebase Hosting も設定する**にチェック
5. 「アプリを登録」をクリック
6. Firebase設定（`firebaseConfig`）をコピーしておく

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Local Setup

### 1. リポジトリのクローン（または初期化）

```bash
# 既存リポジトリの場合
git clone <repository-url>
cd <repository-name>

# 新規リポジトリの場合
mkdir hyakunin-isshu-web
cd hyakunin-isshu-web
git init
```

### 2. ブランチの作成

```bash
git checkout -b 001-phase0-foundation
```

### 3. プロジェクト構造の作成

```bash
# ディレクトリ構造を作成
mkdir -p apps/web/src/{pages,components,lib,types}
mkdir -p data
mkdir -p scripts
```

### 4. Vite + React + TypeScript プロジェクトの初期化

```bash
# apps/web ディレクトリに移動
cd apps/web

# Vite で React + TypeScript プロジェクトを作成
npm create vite@latest . -- --template react-ts

# 依存関係をインストール
npm install

# 追加の依存関係をインストール
npm install react-router-dom firebase

# 開発用依存関係をインストール
npm install -D tailwindcss postcss autoprefixer eslint prettier
```

### 5. Tailwind CSS の設定

```bash
# Tailwind CSS を初期化
npx tailwindcss init -p
```

**`tailwind.config.js` を編集**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**`src/index.css` を編集**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. 環境変数の設定

**`.env.example` を作成**（`apps/web/.env.example`）:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**`.env` ファイルを作成**（`apps/web/.env`）:
```bash
# .env.example をコピー
cp .env.example .env

# .env ファイルを編集して、Firebaseの設定を入力
nano .env
```

Firebase Consoleからコピーした `firebaseConfig` の値を `.env` ファイルに貼り付けます。

**`.gitignore` に `.env` を追加**（`apps/web/.gitignore`）:
```
# .env ファイルを追加
.env
```

### 7. Firebase初期化ファイルの作成

**`apps/web/src/lib/firebase.ts` を作成**:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase appを初期化
const app = initializeApp(firebaseConfig);

// Firestore clientをexport
export const db = getFirestore(app);
```

### 8. 型定義の作成

**`apps/web/src/types/poem.ts` を作成**:
```typescript
export interface Poem {
  poemId: string;
  order: number;
  yomi: string;
  yomiKana: string;
  tori: string;
  toriKana: string;
  kimarijiCount: number;
  kimariji: string;
  author: string;
}
```

### 9. ページコンポーネントの作成

**`apps/web/src/pages/TopPage.tsx` を作成**:
```tsx
import { Link } from 'react-router-dom';

export default function TopPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        百人一首 Web競技サービス
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        百人一首の読札（上の句）を一覧表示します。段階0では基本機能のみを提供します。
      </p>
      <Link
        to="/basic"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        基本へ
      </Link>
    </div>
  );
}
```

**`apps/web/src/pages/BasicPage.tsx` を作成**:
```tsx
import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Poem } from '../types/poem';
import PoemCard from '../components/PoemCard';

type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

export default function BasicPage() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPoems = async () => {
      setLoadingState('loading');
      try {
        const poemsRef = collection(db, 'poems');
        const q = query(poemsRef, orderBy('order', 'asc'));
        const querySnapshot = await getDocs(q);
        const poemsData = querySnapshot.docs.map(doc => doc.data() as Poem);
        setPoems(poemsData);
        setLoadingState(poemsData.length > 0 ? 'success' : 'empty');
      } catch (err) {
        console.error('Failed to fetch poems:', err);
        setError('エラー（取得失敗）');
        setLoadingState('error');
      }
    };

    fetchPoems();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">基本（読札一覧）</h1>

        {loadingState === 'loading' && (
          <div className="text-center text-gray-600">読み込み中...</div>
        )}

        {loadingState === 'error' && (
          <div className="text-center text-red-600">{error}</div>
        )}

        {loadingState === 'empty' && (
          <div className="text-center text-gray-600">0件（未投入）</div>
        )}

        {loadingState === 'success' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {poems.map(poem => (
              <PoemCard key={poem.poemId} poem={poem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 10. コンポーネントの作成

**`apps/web/src/components/PoemCard.tsx` を作成**:
```tsx
import { Poem } from '../types/poem';

interface PoemCardProps {
  poem: Poem;
}

export default function PoemCard({ poem }: PoemCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
      <div className="text-sm text-gray-500 mb-2">No. {poem.order}</div>
      <div className="text-gray-900">{poem.yomi}</div>
    </div>
  );
}
```

### 11. ルーティングの設定

**`apps/web/src/App.tsx` を編集**:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopPage from './pages/TopPage';
import BasicPage from './pages/BasicPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/basic" element={<BasicPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### 12. Seedデータの作成

**`data/poems.seed.json` を作成**（repository root）:
```json
[
  {
    "poemId": "p001",
    "order": 1,
    "yomi": "秋の田の かりほの庵の 苫をあらみ",
    "yomiKana": "あきのたの かりほのいおの とまをあらみ",
    "tori": "わが衣手は 露にぬれつつ",
    "toriKana": "わがころもでは つゆにぬれつつ",
    "kimarijiCount": 3,
    "kimariji": "あきの",
    "author": "天智天皇"
  },
  // ... 残り99件
]
```

**Note**: 百人一首の正確なデータは公開されているため、Wikipediaや専門サイトから取得してください。

### 13. Seedスクリプトの作成

**`scripts/seed_poems.ts` を作成**（repository root）:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env ファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Poem {
  poemId: string;
  order: number;
  yomi: string;
  yomiKana: string;
  tori: string;
  toriKana: string;
  kimarijiCount: number;
  kimariji: string;
  author: string;
}

async function seedPoems() {
  console.log('🌱 Starting seed: poems...');

  const poemsPath = path.resolve(__dirname, '../data/poems.seed.json');
  const poemsData: Poem[] = JSON.parse(fs.readFileSync(poemsPath, 'utf-8'));

  console.log(`📝 Found ${poemsData.length} poems to seed`);

  const promises = poemsData.map(poem => {
    const poemRef = doc(db, 'poems', poem.poemId);
    return setDoc(poemRef, poem, { merge: true });
  });

  await Promise.all(promises);

  console.log(`✅ Seeded ${poemsData.length} poems successfully.`);
  process.exit(0);
}

seedPoems().catch(error => {
  console.error('❌ Error seeding poems:', error);
  process.exit(1);
});
```

**`package.json` に seed スクリプトを追加**（repository root）:
```json
{
  "scripts": {
    "seed:poems": "tsx scripts/seed_poems.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "dotenv": "^16.3.1"
  }
}
```

**依存関係をインストール**:
```bash
# repository root
npm install -D tsx dotenv
```

### 14. Firestore Rulesの設定

**`firestore.rules` を作成**（repository root）:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // poems: read allowed, write denied
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false;
    }

    // All other collections: deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 15. Firebase Hosting の設定

**`firebase.json` を作成**（repository root）:
```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

**`.firebaserc` を作成**（repository root）:
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

**Note**: `your-project-id` をFirebase Consoleのプロジェクト IDに置き換えてください。

### 16. Firebase CLIでログイン

```bash
# Firebase CLIでログイン
firebase login

# プロジェクトが正しく設定されているか確認
firebase projects:list
```

## Running Locally

### 1. Seedデータを投入

```bash
# repository root
npm run seed:poems
```

**Expected Output**:
```
🌱 Starting seed: poems...
📝 Found 100 poems to seed
✅ Seeded 100 poems successfully.
```

### 2. 開発サーバーを起動

```bash
# apps/web ディレクトリに移動
cd apps/web

# 開発サーバーを起動
npm run dev
```

**Expected Output**:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. ブラウザで確認

1. ブラウザで `http://localhost:5173/` にアクセス
2. トップページが表示される
3. 「基本へ」ボタンをクリック
4. Basicページで100件のpoemsが order 昇順で表示される

## Deployment

### 1. ビルド

```bash
# apps/web ディレクトリで実行
cd apps/web
npm run build
```

**Expected Output**:
```
vite v5.x.x building for production...
✓ XXX modules transformed.
dist/index.html                  X.XX kB
dist/assets/index-XXXXXXXX.js    XX.XX kB │ gzip: XX.XX kB
✓ built in XXXms
```

### 2. Firestore Rulesのデプロイ

```bash
# repository root
firebase deploy --only firestore:rules
```

### 3. Hostingのデプロイ

```bash
# repository root
firebase deploy --only hosting
```

**Expected Output**:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

### 4. デプロイ確認

1. Hosting URLにアクセス（`https://your-project-id.web.app`）
2. トップページが表示される
3. 「基本へ」ボタンをクリック
4. `/basic` URLに直接アクセスしても正常に表示される（SPAリライト確認）

## Troubleshooting

### 問題: `npm run seed:poems` でエラーが発生する

**原因**: 環境変数が設定されていない

**解決策**:
1. `apps/web/.env` ファイルが存在するか確認
2. `.env` ファイルにすべての環境変数が設定されているか確認
3. Firebase Consoleでプロジェクト設定を再確認

### 問題: Basicページで「エラー（取得失敗）」が表示される

**原因**: Firestore Rulesが設定されていない、または接続エラー

**解決策**:
1. Firebase Consoleで Firestore Database が有効化されているか確認
2. `firebase deploy --only firestore:rules` でRulesをデプロイ
3. ブラウザのコンソールでエラーメッセージを確認

### 問題: Hosting URLで404エラーが表示される

**原因**: ビルドが正しく実行されていない、またはSPAリライトが設定されていない

**解決策**:
1. `npm run build` を再実行
2. `firebase.json` の `public` パスが `apps/web/dist` になっているか確認
3. `firebase deploy --only hosting` を再実行

## Next Steps

段階0が完了したら、次のステップに進みます：

1. **段階1**: フリップ表示、決まり字数フィルタ、除外チェック機能の追加
2. **段階2**: ユーザー認証（Auth）、個人設定の保存
3. **段階3**: 音声・画像対応
4. **段階4**: 暦自動取得・表示

段階0完了の確認は、Constitution の Definition of Done を参照してください。
