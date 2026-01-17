# Implementation Plan: Phase 0 - Foundation Infrastructure

**Branch**: `001-phase0-foundation` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-phase0-foundation/spec.md`

## Summary

段階0では「開発の土台」を完成させる。React + TypeScript + Vite でフロントエンドアプリケーションを構築し、Firebase（Firestore, Hosting）と連携して百人一首の読札（poems）を表示する基本機能を実装する。デプロイ可能な状態を早期に確立し、環境変数による安全な設定管理とSPAリライトによる直接URLアクセス対応を実現する。

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 18.x
**Primary Dependencies**: React 18, Vite 5, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3
**Storage**: Firebase Firestore（NoSQL document database）
**Testing**: Vitest (unit), Playwright (E2E) - ただし段階0ではテスト実装は任意
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
**Project Type**: web（frontend only with Firebase backend services）
**Performance Goals**:
  - ページ表示3秒以内（100件のpoems表示）
  - Seed投入30秒以内（100件のupsert）
  - ローカル開発環境起動5分以内

**Constraints**:
  - 段階0では認証機能なし（すべてのユーザーがpoems閲覧可能）
  - Firestoreへの書き込みはseedスクリプトのみ（本番環境でのwrite禁止）
  - 画像・音声ファイルは段階0では使用しない（転送量削減）
  - UIは最小限でレスポンシブ対応必須

**Scale/Scope**:
  - 100件のpoemsデータ（固定）
  - 2ページ（Top, Basic）
  - 想定ユーザー数: 段階0では未定（段階1以降で拡大）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Phase-Based Development（段階別開発）✅

**Check**: 段階0の範囲（In Scope / Out of Scope）が明確に定義されているか

- ✅ **Pass**: 仕様書で In Scope（リポジトリ構成、Firebase連携、poems表示、seed、デプロイ）と Out of Scope（フリップ表示、フィルタ、Auth、課金など）を明確に分離
- ✅ **Pass**: 段階0完了の Definition of Done を定義済み

**Action**: ✅ 合格 - Phase 0 research に進む

### II. Infrastructure-First Approach（インフラ優先アプローチ）✅

**Check**: インフラとデプロイ可能性が優先されているか

- ✅ **Pass**: React+TS+Vite のフロント雛形を作成（Step 1）
- ✅ **Pass**: Firebase Hosting へのデプロイ手順を確立（Step 5）
- ✅ **Pass**: Firestore 接続と基本的なCRUD操作（seedのみ）を実装（Step 2, 4）
- ✅ **Pass**: `npm i` → `npm run dev` で動作する再現可能なセットアップ（Step 6 README）

**Action**: ✅ 合格 - インフラ優先の実装順序を維持

### III. Type Safety（型安全性）✅

**Check**: TypeScriptによる型安全性が確保されているか

- ✅ **Pass**: すべてのコードをTypeScriptで記述（Technical Context確認）
- ✅ **Pass**: Firebase SDKの型定義を活用（Step 2でFirestore型定義使用）
- ✅ **Pass**: ビルドエラーがない状態を維持（Step 5で `npm run build` 確認）

**Action**: ✅ 合格 - 型安全性を維持した実装を継続

### IV. Minimal UI with Responsive Design（最小限のレスポンシブUI）✅

**Check**: UIが最小限でレスポンシブ対応しているか

- ✅ **Pass**: Tailwind CSSを導入（Step 1）
- ✅ **Pass**: Top → Basic の導線を作成（Step 1 routing）
- ✅ **Pass**: Basicページでpoems（上の句）を order 昇順で表示（Step 3）
- ✅ **Pass**: デザインの洗練は段階1以降に延期（仕様書の Assumptions で明示）

**Action**: ✅ 合格 - 機能優先、デザインは最小限を維持

### V. Secure Configuration Management（安全な設定管理）✅

**Check**: 鍵情報がリポジトリに直書きされていないか

- ✅ **Pass**: Firebase設定を環境変数（.env）経由で読み込む（Step 2）
- ✅ **Pass**: `.env.example` を提供（Step 6 README）
- ✅ **Pass**: READMEに設定手順を記載（Step 6）

**Action**: ✅ 合格 - 環境変数による安全な設定管理を実施

### 総合評価

**結果**: ✅ **すべてのConstitution Checkに合格**

段階0の実装計画は憲法のすべての原則に準拠しており、Phase 0 researchに進むことができます。

## Project Structure

### Documentation (this feature)

```text
specs/001-phase0-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 research (技術選定の根拠)
├── data-model.md        # Phase 1 data model (Poemエンティティの詳細)
├── quickstart.md        # Phase 1 quickstart (セットアップ手順)
├── contracts/           # Phase 1 contracts (Firestore schema)
│   └── firestore-schema.md
└── checklists/
    └── requirements.md  # Spec quality checklist (already created)
```

### Source Code (repository root)

```text
apps/
└── web/                 # Frontend application (Vite + React + TS)
    ├── src/
    │   ├── pages/
    │   │   ├── TopPage.tsx       # Top page component
    │   │   └── BasicPage.tsx     # Basic page component (poems list)
    │   ├── components/
    │   │   └── PoemCard.tsx      # Poem card component
    │   ├── lib/
    │   │   └── firebase.ts       # Firebase initialization & config
    │   ├── types/
    │   │   └── poem.ts           # Poem type definition
    │   ├── App.tsx               # Root component with routing
    │   ├── main.tsx              # Entry point
    │   └── index.css             # Tailwind imports
    ├── public/
    ├── .env.example              # Environment variable template
    ├── .gitignore                # Including .env
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── postcss.config.js

data/
└── poems.seed.json              # 100 poems seed data

scripts/
└── seed_poems.ts                # Seed script (Firestore upsert)

firebase.json                    # Firebase Hosting config (SPA rewrite)
firestore.rules                  # Firestore security rules
.firebaserc                      # Firebase project config
README.md                        # Setup & deployment instructions
```

**Structure Decision**: Web application構成を選択。`apps/web` にフロントエンドアプリケーションを配置し、Firebase Cloud Functions は段階0では使用しない（将来の拡張に備えて `functions/` ディレクトリを予約）。Seed スクリプトは repository root の `scripts/` に配置し、npm scriptsから実行可能にする。

## Implementation Steps (6 Steps from User Input)

### Step 1: プロジェクト雛形作成

**Goal**: Vite + React + TypeScript + Tailwind CSS のプロジェクトを作成し、基本的なルーティングを設定

**Tasks**:
1. `apps/web` ディレクトリを作成
2. Vite で React + TypeScript プロジェクトを初期化
3. `react-router-dom` をインストール
4. Tailwind CSS を導入（postcss含む）
5. ルーティング設定: `/` (TopPage) と `/basic` (BasicPage)
6. ESLint + Prettier を導入

**Deliverables**:
- `apps/web/package.json` with dependencies
- `apps/web/src/App.tsx` with routing
- `apps/web/src/pages/TopPage.tsx` (basic structure)
- `apps/web/src/pages/BasicPage.tsx` (basic structure)
- `apps/web/tailwind.config.js`
- `apps/web/.eslintrc.js`, `apps/web/.prettierrc`

**Validation**: `npm run dev` でTopページとBasicページが表示され、遷移が動作する

---

### Step 2: Firebase接続設定

**Goal**: Firebase Web SDKを導入し、環境変数から設定を読み込んでFirestore clientを初期化

**Tasks**:
1. Firebase Web SDK (`firebase`) をインストール
2. `apps/web/src/lib/firebase.ts` を作成
3. 環境変数から Firebase config を読み込む（Vite の `import.meta.env.*`）
4. Firestore client を export
5. `.env.example` を作成し、必要な環境変数を明示
6. `.gitignore` に `.env` を追加

**Environment Variables** (`.env.example`):
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Deliverables**:
- `apps/web/src/lib/firebase.ts` (Firebase initialization)
- `apps/web/.env.example`
- Updated `apps/web/.gitignore`

**Validation**: Firebase client が正常に初期化され、ビルドエラーがない

---

### Step 3: Poems表示機能

**Goal**: Firestoreから poems を取得し、Basicページで order 昇順にカード表示

**Tasks**:
1. `apps/web/src/types/poem.ts` を作成（Poem型定義）
2. Firestore から `poems` collection を取得するロジックを実装
3. `order` フィールド昇順でソート
4. BasicPage にカード表示（loading/error/empty状態を含む）
5. `apps/web/src/components/PoemCard.tsx` を作成（order と kami を表示）
6. Tailwind でレスポンシブなカードレイアウト

**Poem Type** (`apps/web/src/types/poem.ts`):
```typescript
export interface Poem {
  poemId: string;
  order: number;
  kami: string;
  shimo: string;
  kimarijiCount: number;
}
```

**States**:
- **Loading**: "読み込み中..." を表示
- **Error**: "エラー（取得失敗）" を表示
- **Empty**: "0件（未投入）" を表示
- **Success**: Poemsカード一覧を表示

**Deliverables**:
- `apps/web/src/types/poem.ts`
- `apps/web/src/components/PoemCard.tsx`
- Updated `apps/web/src/pages/BasicPage.tsx` (Firestore fetch logic)

**Validation**: Firestoreに100件のpoemsがある状態で、Basicページにorder昇順で表示される

---

### Step 4: Seedスクリプト

**Goal**: `npm run seed:poems` コマンドで100件のpoemsをFirestoreにupsert

**Tasks**:
1. `data/poems.seed.json` を作成（100件の百人一首データ）
2. `scripts/seed_poems.ts` を作成（TypeScript）
3. Firestore Admin SDK または Web SDK でupsertロジックを実装
4. 同じ `poemId` の場合は上書き（upsert）
5. 投入完了後にコンソールへ件数をログ表示
6. `package.json` に `seed:poems` スクリプトを追加

**Seed Data Structure** (`data/poems.seed.json`):
```json
[
  {
    "poemId": "poem_001",
    "order": 1,
    "kami": "秋の田の...",
    "shimo": "...",
    "kimarijiCount": 3
  },
  ...
]
```

**npm script** (`package.json`):
```json
{
  "scripts": {
    "seed:poems": "tsx scripts/seed_poems.ts"
  }
}
```

**Deliverables**:
- `data/poems.seed.json` (100 poems)
- `scripts/seed_poems.ts` (upsert logic)
- Updated `package.json` with `seed:poems` script

**Validation**: `npm run seed:poems` を実行すると、100件がFirestoreに投入され、コンソールに件数が表示される

---

### Step 5: Hosting & Firestore Rules

**Goal**: Firebase Hosting のSPA rewrite設定とFirestore security rulesを設定し、デプロイ確認

**Tasks**:
1. `firebase.json` を作成（SPA rewrite: すべてのURLを `/index.html` にリライト）
2. `firestore.rules` を作成（`poems` read可、write不可。他は拒否）
3. `.firebaserc` を作成（Firebase project ID）
4. `firebase deploy --only hosting,firestore:rules` を実行してデプロイ確認

**firebase.json**:
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

**firestore.rules**:
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

**Deliverables**:
- `firebase.json`
- `firestore.rules`
- `.firebaserc`

**Validation**:
- `npm run build` が成功する
- `firebase deploy --only hosting,firestore:rules` が成功する
- Hosting URLでTopページが表示される
- `/basic` に直接アクセスしても正常に表示される（SPA rewrite確認）

---

### Step 6: README作成

**Goal**: セットアップ手順、Seed投入方法、デプロイ手順をREADMEに記載し、第三者が環境を再現できるようにする

**README Content**:
1. **プロジェクト概要**: 段階0の目的と範囲
2. **前提条件**: Node.js 18+, npm, Firebaseプロジェクト作成済み
3. **セットアップ手順**:
   - `npm install`（repository root と `apps/web`）
   - `.env` ファイル作成（`.env.example` をコピー）
   - Firebase config を `.env` に設定
4. **Seedデータ投入**: `npm run seed:poems`
5. **ローカル開発**: `npm run dev`
6. **ビルド**: `npm run build`
7. **デプロイ**: `firebase deploy --only hosting,firestore:rules`
8. **動作確認手順**:
   - Topページ表示確認
   - Basicページへ遷移確認
   - `/basic` 直接アクセス確認
   - 100件のpoems表示確認（order昇順）

**Deliverables**:
- `README.md` (repository root)

**Validation**: READMEの手順に従って、第三者が環境を再現できる

---

## Risk Mitigation (段階0)

### 鍵の直書き禁止
- **対策**: `.env` ファイルで環境変数管理、`.gitignore` に `.env` を追加
- **検証**: `.env.example` のみをリポジトリにコミット、`.env` が含まれていないことを確認

### Firestore読み取り最小化
- **対策**: 一覧取得のみ実装（詳細取得は段階1以降）
- **検証**: Firestore Rulesで `poems` read許可、write禁止を設定

### 画像・音声の転送量回避
- **対策**: 段階0では画像・音声ファイルを使用しない（テキストのみ）
- **検証**: `data/poems.seed.json` にテキストデータのみ含める

### スコープクリープ防止
- **対策**: 段階0の In Scope / Out of Scope を厳密に守る
- **検証**: Constitution Check で段階0範囲を再確認

---

## Complexity Tracking

**No violations**: すべてのConstitution Checkに合格しており、複雑度の正当化は不要。

---

## Phase 0 Research Tasks

次のセクションで Phase 0 research を実施し、`research.md` を生成します。

**Research Topics**:
1. Vite + React + TypeScript のベストプラクティス
2. Firebase Web SDK 10 の Firestore 接続パターン
3. Tailwind CSS のレスポンシブデザインパターン
4. Firestore Seed スクリプトの実装方法（upsert pattern）
5. Firebase Hosting の SPA rewrite 設定

これらの調査結果は `research.md` にまとめられます。
