# Quickstart Guide: Phase 0 - Official Banzuke System

**Feature**: Phase 0 - Official Banzuke System
**Branch**: `003-official-banzuke`
**Date**: 2026-01-17
**Tech Stack**: Vite + React + TypeScript + Tailwind CSS + Firebase (Auth/Firestore/Functions/Hosting)

このガイドは、開発者が段階0の開発環境をセットアップし、最初のコードを実行するまでの手順を提供します。

---

## Prerequisites

開発環境に以下がインストールされていることを確認してください：

### Required Software

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

- **Firebase CLI**: Firebase操作用
  ```bash
  npm install -g firebase-tools
  firebase --version  # v13.0.0以上推奨
  ```

### Firebase Account

- [Firebase Console](https://console.firebase.google.com/)でアカウント作成済み
- Blazeプラン（従量課金）へのアップグレード権限

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd antigravity_claude
git checkout 003-official-banzuke
```

### 2. Install Frontend Dependencies

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

### 3. Install Cloud Functions Dependencies

```bash
cd ../../functions  # From repo root
npm install
```

**Expected dependencies**:
- firebase-admin (Admin SDK)
- firebase-functions v2

---

## Firebase Project Setup

### 1. Create Firebase Project

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `karuta-banzuke`）
4. Google Analyticsは任意（段階0では不要）
5. プロジェクト作成を完了

### 2. Upgrade to Blaze Plan

Cloud Functionsを使用するため、Blazeプランが必須です：

1. Firebase Console → 左下の「Upgrade」
2. Blazeプラン（従量課金）を選択
3. 予算アラート設定（推奨: ¥1,000/月）
4. 支払い情報を登録

### 3. Enable Authentication

1. Firebase Console → 「Authentication」
2. 「始める」をクリック
3. ログイン方法を有効化：
   - **Google**: 有効にする（サポートメールを設定）
   - **匿名**: 有効にする

### 4. Create Firestore Database

1. Firebase Console → 「Firestore Database」
2. 「データベースを作成」をクリック
3. **本番環境モード**を選択（Security Rulesは後で設定）
4. ロケーション選択：**asia-northeast1（東京）**を推奨
5. 作成を完了

### 5. Get Firebase Configuration

#### 5.1. Web App Configuration

1. Firebase Console → プロジェクト設定（⚙️アイコン）
2. 「マイアプリ」セクションで「ウェブアプリを追加」をクリック
3. アプリのニックネームを入力（例: `karuta-web`）
4. **Firebase Hosting**はチェック不要（後で設定）
5. 「アプリを登録」をクリック
6. 表示される設定値をコピー：

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "karuta-banzuke.firebaseapp.com",
  projectId: "karuta-banzuke",
  storageBucket: "karuta-banzuke.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

#### 5.2. Service Account Key (for seed script)

1. Firebase Console → プロジェクト設定 → サービスアカウント
2. 「新しい秘密鍵を生成」をクリック
3. ダウンロードしたJSONファイルを`scripts/service-account-key.json`に配置

```bash
mv ~/Downloads/karuta-banzuke-*.json scripts/service-account-key.json
```

**Important**: `service-account-key.json`は`.gitignore`に含まれており、コミットされません。

---

## Environment Variables Setup

### 1. Create Frontend `.env` File

```bash
cd apps/web
cp .env.example .env
```

### 2. Fill in Firebase Configuration

```bash
# apps/web/.env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=karuta-banzuke.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=karuta-banzuke
VITE_FIREBASE_STORAGE_BUCKET=karuta-banzuke.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

**Important**:
- `.env`は`.gitignore`に含まれており、コミットされません
- Viteでは`VITE_`プレフィックスが必須です（環境変数がブラウザに公開される）

---

## Initialize Firebase

### 1. Login to Firebase CLI

```bash
firebase login
```

ブラウザが開き、Googleアカウントでログインします。

### 2. Initialize Firebase Project

```bash
# Repo root
firebase init
```

以下を選択：
- **Firestore**: Yes（Security Rules & Indexes）
- **Functions**: Yes（TypeScript）
- **Hosting**: Yes（SPA設定）
- **Existing project**: 先ほど作成したプロジェクトを選択

設定項目：
- Firestore rules file: `firebase/firestore.rules`
- Firestore indexes file: `firebase/firestore.indexes.json`
- Functions language: **TypeScript**
- ESLint: Yes
- Install dependencies: Yes
- Public directory: `apps/web/dist`
- Single-page app: **Yes**
- GitHub auto-deploy: No（後で設定可）

---

## Seed Poems Data

### 1. Prepare Seed Data

`scripts/poems.seed.json`に100首のデータが含まれていることを確認します。

**Schema validation**:
```bash
cd scripts
npm run validate:poems  # Optional: Run validation script
```

### 2. Run Seed Script

```bash
npm run seed:poems
```

**Expected Output**:
```
✅ Seeded 100 poems successfully.
```

### 3. Verify in Firestore Console

1. Firebase Console → Firestore Database → データタブ
2. `poems`コレクションに100件のドキュメント（`p001`〜`p100`）が存在することを確認
3. 任意のドキュメントを開き、フィールドを確認：
   - order, yomi, yomiKana, tori, toriKana, kimariji, kimarijiCount, author

---

## Deploy Firestore Security Rules

### 1. Review Rules

```bash
cat firebase/firestore.rules
```

**Expected content**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Poems: Public read, no writes
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false;
    }

    // Users: User-owned data
    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.keys().hasAll(['nickname', 'banzukeConsent', 'createdAt', 'updatedAt']);
      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nickname', 'updatedAt']);
      allow delete: if false;
    }

    // Submissions: Function-only writes, user can read own
    match /submissions/{submissionId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

### 2. Deploy Rules

```bash
firebase deploy --only firestore:rules
```

**Expected Output**:
```
✅ Deploy complete!
```

### 3. Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

この時点ではインデックスは空でもOKです（後でbanzukeクエリ実行時に自動生成されます）。

---

## Deploy Cloud Functions

### 1. Build Functions

```bash
cd functions
npm run build
```

**Expected Output**:
```
Compiled successfully.
```

### 2. Deploy to Firebase

```bash
# From repo root
firebase deploy --only functions
```

**Expected Output**:
```
✅ Function(s) deployed successfully.

Function URL (submitOfficialRecord):
https://asia-northeast1-karuta-banzuke.cloudfunctions.net/submitOfficialRecord
```

**Note**: Callable functionsはHTTPS URLを持ちますが、クライアントは`httpsCallable()`経由で呼び出します（URLを直接使用しません）。

### 3. Verify Deployment

Firebase Console → Functions → submitOfficialRecordが表示されることを確認

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
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   └── PracticeQuestion.tsx
│   ├── pages/                # Page components
│   │   ├── HomePage.tsx
│   │   ├── PracticePage.tsx
│   │   ├── ResultPage.tsx
│   │   ├── BanzukePage.tsx
│   │   └── ProfileSetupPage.tsx
│   ├── services/             # Business logic (Firebase)
│   │   ├── firebase.ts       # Firebase initialization
│   │   ├── auth.service.ts   # Authentication
│   │   ├── poems.service.ts  # Poems queries
│   │   ├── users.service.ts  # User profile CRUD
│   │   ├── practice.service.ts # Practice session logic
│   │   ├── submission.service.ts # Official submission
│   │   └── banzuke.service.ts # Banzuke queries
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── usePoems.ts
│   │   └── usePracticeSession.ts
│   ├── types/                # TypeScript types
│   │   ├── poem.ts
│   │   ├── user.ts
│   │   ├── submission.ts
│   │   └── practice.ts
│   └── utils/                # Utilities
│       ├── timer.ts          # High-precision timing
│       └── random.ts         # Random poem selection
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
import { getFunctions } from 'firebase/functions';

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
export const functions = getFunctions(app, 'asia-northeast1'); // Tokyo region
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

#### Official Submission

```typescript
// src/services/submission.service.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { SubmitOfficialRecordPayload, SubmitOfficialRecordResponse } from '../types/submission';

const submitOfficialRecordFn = httpsCallable<SubmitOfficialRecordPayload, SubmitOfficialRecordResponse>(
  functions,
  'submitOfficialRecord'
);

export async function submitOfficialRecord(payload: SubmitOfficialRecordPayload): Promise<SubmitOfficialRecordResponse> {
  const result = await submitOfficialRecordFn(payload);
  return result.data;
}
```

---

## Testing

### Unit Tests (Vitest)

```bash
cd apps/web
npm run test
```

**Test coverage goals**:
- Services: 80%+ coverage
- Utils (timer, random): 100% coverage
- Components: 50%+ coverage (focus on logic)

### E2E Tests (Playwright - Optional)

```bash
cd apps/web
npx playwright install  # First time only
npm run test:e2e
```

**Test scenarios**:
1. User completes practice session
2. User logs in and sets up profile
3. User submits official record
4. Banzuke displays rankings

### Cloud Functions Testing (Emulator)

```bash
firebase emulators:start
```

**Emulators started**:
- Firestore: http://localhost:8080
- Functions: http://localhost:5001
- Auth: http://localhost:9099

**Test with curl**:
```bash
# Note: Callable functions need proper auth token in real usage
# For testing, use Firebase SDK client
```

---

## Build & Deploy

### Build Frontend for Production

```bash
cd apps/web
npm run build
```

**Output**: `apps/web/dist/`ディレクトリにビルド成果物が生成される

**Build optimizations**:
- Vite automatically minifies JS/CSS
- Tailwind purges unused classes
- Code splitting for React and Firebase vendors

### Preview Production Build Locally

```bash
npm run preview
```

ブラウザで http://localhost:4173/ にアクセス

### Deploy to Firebase Hosting

#### 1. Configure Hosting (if not done in firebase init)

Edit `firebase.json`:
```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### 2. Build & Deploy

```bash
cd apps/web
npm run build

cd ../..  # Repo root
firebase deploy --only hosting
```

**Expected Output**:
```
✅ Deploy complete!

Hosting URL: https://karuta-banzuke.web.app
```

#### 3. Deploy Everything at Once

```bash
# Build frontend first
cd apps/web && npm run build && cd ../..

# Deploy all Firebase resources
firebase deploy
```

This deploys:
- Firestore Rules
- Firestore Indexes
- Cloud Functions
- Hosting

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
2. Import Firebase dependencies (`db`, `auth`, `functions`)
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

### View Cloud Functions Logs

Firebase Console → Functions → submitOfficialRecord → ログ

Or via CLI:
```bash
firebase functions:log --only submitOfficialRecord
```

---

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"

**Solution**: Firebase Console → Authentication → 設定 → 承認済みドメイン → `localhost`と`127.0.0.1`を追加

### Issue: "Firestore: Missing or insufficient permissions"

**Solution**:
1. Security Rulesを確認（`firebase/firestore.rules`）
2. `firebase deploy --only firestore:rules`でデプロイされているか確認
3. Firebase Consoleでルールを確認

### Issue: "Module not found: firebase/app"

**Solution**:
```bash
cd apps/web
npm install firebase
```

### Issue: Cloud Functions deployment fails

**Possible causes**:
1. **Blazeプランでない**: Firebase Console → Upgradeを確認
2. **Node.jsバージョン不一致**: `functions/package.json`の`engines.node`を確認
3. **TypeScriptコンパイルエラー**: `cd functions && npm run build`でエラー確認

**Solution**:
```bash
cd functions
npm run lint  # Check for TypeScript errors
npm run build # Ensure compilation succeeds
firebase deploy --only functions --debug # Verbose output
```

### Issue: Environment variables not loading

**Solution**:
1. `.env`ファイルが`apps/web/`直下にあることを確認
2. 全ての環境変数名が`VITE_`プレフィックスで始まっていることを確認
3. Dev serverを再起動（環境変数は起動時に読み込まれる）

### Issue: Vite dev server not starting

**Solution**:
```bash
# Clear cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: "Index required" error on banzuke query

**Solution**:
1. Firestoreがインデックス作成リンクを提供するので、クリックして作成
2. または`firebase/firestore.indexes.json`にインデックスを追加して`firebase deploy --only firestore:indexes`

### Issue: Cloud Functions timeout

**Possible causes**:
- Firestore write failed
- Network issues
- Cold start (first invocation after deployment)

**Solution**:
```bash
# Check logs
firebase functions:log --only submitOfficialRecord

# Increase timeout in functions/src/index.ts
export const submitOfficialRecord = onCall({
  timeoutSeconds: 60, // Default is 60s
  region: 'asia-northeast1'
}, async (request) => { ... });
```

---

## Development Workflow

### Daily Development

1. Start dev server: `cd apps/web && npm run dev`
2. Make changes to frontend code
3. Hot reload automatically reflects changes
4. Test in browser at http://localhost:5173/

### Testing Cloud Functions Locally

1. Start emulators: `firebase emulators:start`
2. Update frontend to use emulator:

```typescript
// src/services/firebase.ts
import { connectFunctionsEmulator } from 'firebase/functions';

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

3. Submit practice results → calls local function

### Deploying Changes

**Frontend only**:
```bash
cd apps/web && npm run build && cd ../.. && firebase deploy --only hosting
```

**Functions only**:
```bash
firebase deploy --only functions
```

**Full deployment** (after major changes):
```bash
firebase deploy
```

---

## Next Steps

1. **Implement User Stories**: Follow `spec.md` for requirements
2. **Follow Tasks**: Run `/speckit.tasks` to generate `tasks.md` with implementation tasks
3. **Monitor Performance**: Firebase Console → Performance (optional)
4. **Set Up CI/CD**: GitHub Actions for auto-deploy (optional)

---

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com/)

---

## Support

質問がある場合は、プロジェクトのREADME.mdまたはチームチャンネルを参照してください。

**Useful Commands Quick Reference**:

```bash
# Development
npm run dev                    # Start dev server (apps/web)
firebase emulators:start       # Start Firebase emulators

# Testing
npm run test                   # Run unit tests
npm run test:e2e               # Run E2E tests
firebase deploy --only firestore:rules --dry-run # Test rules deployment

# Building
npm run build                  # Build frontend for production
npm run build --watch          # Build functions in watch mode (functions/)

# Deployment
firebase deploy                # Deploy everything
firebase deploy --only hosting # Deploy frontend only
firebase deploy --only functions # Deploy Cloud Functions only
firebase deploy --only firestore:rules # Deploy Security Rules only

# Utilities
firebase login                 # Authenticate Firebase CLI
firebase projects:list         # List Firebase projects
firebase use <project-id>      # Switch active project
firebase serve                 # Serve locally (alternative to emulators)
```
