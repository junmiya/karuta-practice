# Implementation Plan: Phase 0 - 競技かるた訓練プラットフォーム（MVP最小）

**Branch**: `002-phase0-karuta-training` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-phase0-karuta-training/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

百人一首の競技かるた訓練プラットフォームの段階0（MVP最小）を実装する。Vite + React + TypeScript + Tailwind CSSでSPAを構築し、Firebase（Auth/Firestore/Hosting）をバックエンドとする。ログイン不要の札閲覧（めくり機能）、ログイン後の訓練モード（決まり字別・多択）、クライアント側計測（clientElapsedMs）、Firestore保存、成績閲覧（セット履歴・苦手抽出）を提供する。Cloud Functionsは使用せず、全てフロントエンド完結で実現する。

## Technical Context

**Language/Version**: TypeScript 5.x（Vite + React 18）
**Primary Dependencies**:
- Frontend: React 18, React Router v6, Tailwind CSS 3.x
- Firebase: firebase@10.x（Auth, Firestore SDK）
- Dev Tools: Vite 5.x, TypeScript 5.x, ESLint, Prettier

**Storage**: Firebase Firestore（NoSQL）
- Collections: `/poems/{poemId}`, `/users/{uid}`, `/users/{uid}/trainingSets/{setId}`

**Testing**: Vitest（ユニットテスト）, React Testing Library（コンポーネントテスト）, Playwright（E2Eテスト - オプション）

**Target Platform**: Web（モダンブラウザ: Chrome/Firefox/Safari最新版、モバイルブラウザ対応）

**Project Type**: Web SPA（Single Page Application）

**Performance Goals**:
- 札一覧ページ初回表示: 5秒以内
- 札めくり（yomi⇔tori切替）: 1秒以内
- 訓練モード計測精度: ミリ秒単位（Date.now()ベース）
- Firestore保存: 3秒以内

**Constraints**:
- Firebaseコスト: 月1万円まで（Blaze想定、無料枠狙い）
- クライアント側計測のみ（Cloud Functions使用不可）
- 参考記録として扱う（改ざん耐性は段階0で厳密担保しない）

**Scale/Scope**:
- 100首の百人一首データ（poems）
- ユーザー数: 初期100〜1000ユーザー想定
- 訓練セット: 1ユーザーあたり最大数百件想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Constitution Alignment

- **用語**: yomi/tori/kimariji/kimarijiCount を使用（kami/shimoは使用しない）
- **技術スタック**: Vite + React + TypeScript + Tailwind CSS（Next.js使用しない）
- **Backend**: Firebase（Auth/Firestore/Hosting）のみ、Cloud Functions使用しない
- **段階0ゴール**:
  - ✅ ログイン無しで札閲覧（めくり）
  - ✅ ログイン後に決まり字別の訓練（多択）
  - ✅ clientElapsedMs計測とFirestore保存
  - ✅ 成績閲覧（履歴・簡易集計）
  - ❌ 競技（シーズン・番付・凍結/確定・称号・課金）は段階1以降
- **コスト方針**: Blaze想定、月1万円まで許容、ユーザー配下書き込み（`/users/{uid}/trainingSets`）でコスト削減
- **セキュリティ方針**: 参考記録扱い、最低限の異常値判定、Firestore Security Rules（自分のデータのみアクセス可）

### 🚦 Gates Passed

- **Gate 1 - No Next.js**: ✅ Vite + Reactを使用
- **Gate 2 - No Callable Functions**: ✅ Cloud Functions不使用、フロントエンド完結
- **Gate 3 - Terminology**: ✅ yomi/tori/kimariji/kimarijiCount統一
- **Gate 4 - Phase 0 Scope**: ✅ 競技機能は段階1以降、MVP最小に集中

## Project Structure

### Documentation (this feature)

```text
specs/002-phase0-karuta-training/
├── spec.md              # 仕様書（6 User Stories, 42 FR）
├── plan.md              # このファイル（実装計画）
├── research.md          # Phase 0 output（技術調査）
├── data-model.md        # Phase 1 output（データモデル詳細）
├── quickstart.md        # Phase 1 output（開発者向けクイックスタート）
├── contracts/           # Phase 1 output（API契約 - 該当なし: Firestore直接アクセス）
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output（タスク分解 - /speckit.tasksで生成）
```

### Source Code (repository root)

```text
apps/web/                        # Vite + React SPA
├── public/
│   └── firebase-config.json     # Firebase設定（環境変数から生成）
├── src/
│   ├── main.tsx                 # エントリーポイント
│   ├── App.tsx                  # ルートコンポーネント（Router設定）
│   ├── components/              # 共通コンポーネント
│   │   ├── Layout/
│   │   │   ├── Header.tsx       # ヘッダー（ログイン状態表示）
│   │   │   └── Footer.tsx
│   │   ├── PoemCard/
│   │   │   ├── PoemCard.tsx     # 札カード（めくり機能）
│   │   │   └── PoemCard.module.css
│   │   └── ProtectedRoute/
│   │       └── ProtectedRoute.tsx # 認証ガード
│   ├── pages/                   # ページコンポーネント
│   │   ├── Home.tsx             # ホームページ（/）
│   │   ├── Cards/
│   │   │   ├── CardsList.tsx    # 札一覧（/cards）
│   │   │   └── CardsFilter.tsx  # 決まり字フィルタ
│   │   ├── Login/
│   │   │   └── Login.tsx        # ログインページ（/login）
│   │   ├── Training/
│   │   │   ├── TrainingSetup.tsx      # 訓練セットアップ（/training）
│   │   │   ├── TrainingQuestion.tsx   # 訓練問題画面
│   │   │   └── TrainingResult.tsx     # 訓練結果画面
│   │   └── Results/
│   │       ├── ResultsList.tsx        # 成績一覧（/results）
│   │       ├── ResultDetail.tsx       # セット詳細
│   │       └── WeakPoems.tsx          # 苦手札抽出
│   ├── services/                # ビジネスロジック
│   │   ├── firebase.ts          # Firebase初期化
│   │   ├── auth.service.ts      # 認証サービス
│   │   ├── poems.service.ts     # 札取得サービス
│   │   ├── training.service.ts  # 訓練ロジック（計測・保存）
│   │   └── results.service.ts   # 成績集計サービス
│   ├── hooks/                   # カスタムフック
│   │   ├── useAuth.ts           # 認証状態管理
│   │   ├── usePoems.ts          # 札データ取得
│   │   └── useTimer.ts          # 計測タイマー
│   ├── types/                   # TypeScript型定義
│   │   ├── poem.ts              # Poem型
│   │   ├── trainingSet.ts       # TrainingSet型
│   │   └── user.ts              # User型
│   ├── utils/                   # ユーティリティ
│   │   ├── anomalyDetector.ts   # 異常値判定
│   │   └── shuffle.ts           # 選択肢シャッフル
│   └── index.css                # Tailwind CSS imports
├── .env.example                 # 環境変数テンプレート
├── vite.config.ts               # Vite設定
├── tailwind.config.ts           # Tailwind設定
├── tsconfig.json                # TypeScript設定
└── package.json

data/
└── poems.seed.json              # 100首マスタデータ

scripts/
└── seed-poems.ts                # Firestore投入スクリプト（Node.js）

tests/
├── unit/                        # ユニットテスト（Vitest）
│   ├── services/
│   ├── utils/
│   └── hooks/
└── e2e/                         # E2Eテスト（Playwright - オプション）
    ├── cards.spec.ts
    ├── training.spec.ts
    └── results.spec.ts

firebase/
├── firestore.rules              # Firestore Security Rules
└── firebase.json                # Firebase設定
```

**Structure Decision**: Web SPA（Single Page Application）構成を選択。`apps/web/`配下にVite + React SPAを配置し、`data/`にマスタデータ、`scripts/`にseedスクリプト、`firebase/`にFirebase設定を配置する。Firestore直接アクセスのためAPI層は不要（`contracts/`は生成しない）。

## Implementation Phases

### フェーズ0-0: 土台（Foundation）

**Goal**: Vite + React + TypeScript + Tailwind環境構築、Firebase SDK導入、Hosting初回デプロイ

**Tasks**:
1. Vite + React + TypeScript プロジェクト初期化（`npm create vite@latest apps/web -- --template react-ts`）
2. Tailwind CSS導入（`npm install -D tailwindcss postcss autoprefixer`、`tailwind.config.ts`設定）
3. Firebase SDK導入（`npm install firebase`）
4. Firebase初期化（`src/services/firebase.ts`）
5. 環境変数設定（`.env.example`作成、Firebase設定）
6. Firebase Hosting設定（`firebase init hosting`、`firebase.json`）
7. ビルド＆デプロイ確認（`npm run build && firebase deploy --only hosting`）

**Deliverables**:
- ✅ 起動するSPA（`npm run dev`で開発サーバー起動）
- ✅ Firebaseプロジェクト接続（`.env`管理）
- ✅ Hostingへデプロイ成功

---

### フェーズ0-1: poemsマスタ投入（Seed Data）

**Goal**: `data/poems.seed.json`確定、Firestore投入スクリプト作成、100首投入

**Tasks**:
1. `data/poems.seed.json`作成（100首のyomi/tori/kimariji/kimarijiCount/authorデータ）
2. `scripts/seed-poems.ts`作成（Firestore Admin SDK使用）
3. バリデーション実装（poemId重複チェック、必須フィールドチェック、型チェック）
4. `npm run seed:poems`スクリプト追加（`package.json`）
5. 投入実行＆確認（Firestore Consoleで100件確認）

**Deliverables**:
- ✅ `/poems`コレクションが100件で埋まる
- ✅ `apps/web`から取得・表示できる（`poems.service.ts`で取得確認）

---

### フェーズ0-2: 公開機能（Public Features - ログイン不要）

**Goal**: 札一覧（めくり）、8/16切替、かな表示トグル、決まり字フィルタ

**Tasks**:
1. `pages/Home.tsx`作成（「札を見る」導線）
2. `pages/Cards/CardsList.tsx`作成（札一覧表示）
3. `components/PoemCard/PoemCard.tsx`作成（めくり機能: yomi⇔tori切替）
4. ひらがな表示トグル実装（yomi/tori ⇔ yomiKana/toriKana）
5. 8枚/16枚表示切替実装（表示件数制御）
6. `pages/Cards/CardsFilter.tsx`作成（kimarijiCountまたはkimarijiフィルタ）
7. `services/poems.service.ts`実装（Firestore読み取り）
8. `hooks/usePoems.ts`実装（データ取得フック）

**Deliverables**:
- ✅ 練習閲覧が成立（ログインなしで札を見て学習できる）

---

### フェーズ0-3: Auth + 訓練（Authentication + Training）

**Goal**: Googleログイン、訓練モード（多択8/16）、clientElapsedMs計測、Firestore保存

**Tasks**:
1. `pages/Login/Login.tsx`作成（Googleログイン、匿名ログインボタン）
2. `services/auth.service.ts`実装（`signInWithGoogle`, `signInAnonymously`, `signOut`）
3. `hooks/useAuth.ts`実装（`onAuthStateChanged`でログイン状態管理）
4. `components/ProtectedRoute/ProtectedRoute.tsx`作成（未ログイン時リダイレクト）
5. `pages/Training/TrainingSetup.tsx`作成（フィルタ選択、8/16択選択）
6. `pages/Training/TrainingQuestion.tsx`作成（yomi提示、tori選択肢表示）
7. `hooks/useTimer.ts`実装（`Date.now()`ベース計測、`presentedAtClientMs`, `clientElapsedMs`）
8. `services/training.service.ts`実装（問題生成、正誤判定、セット保存）
9. `utils/anomalyDetector.ts`実装（< 150ms, > 120000ms, 連続同一ms値判定）
10. `pages/Training/TrainingResult.tsx`作成（セット完了画面、平均時間・正答率表示）
11. Firestore保存実装（`/users/{uid}/trainingSets/{setId}`にドキュメント作成）

**Deliverables**:
- ✅ `trainingSets`が保存される（Firestore Consoleで確認）

---

### フェーズ0-4: 成績（Results）

**Goal**: セット履歴一覧（最新20件）、セット詳細、苦手札抽出

**Tasks**:
1. `pages/Results/ResultsList.tsx`作成（セット一覧表示、最新20件）
2. `pages/Results/ResultDetail.tsx`作成（セット詳細、各問のms/正誤/poemId表示）
3. `pages/Results/WeakPoems.tsx`作成（平均時間遅い上位10首、誤答多い上位10首）
4. `services/results.service.ts`実装（セット取得、集計ロジック）
5. グラフ表示実装（各問の時間を可視化、Chart.jsまたはRecharts使用検討）
6. 参考記録ラベル表示（`flags.isReference=true`の場合「参考記録」表示）

**Deliverables**:
- ✅ 苦手札の発見ができる（平均時間・誤答回数でソート表示）

---

### フェーズ0-5: ガードレール（Guardrails）

**Goal**: 異常値判定（参考記録落とし）、Firestore Security Rules

**Tasks**:
1. `utils/anomalyDetector.ts`の完全実装（3パターン判定）
2. `firebase/firestore.rules`作成
   - `/poems/{poemId}`: 全員read可、write不可
   - `/users/{uid}`: 自分のみread/write可
   - `/users/{uid}/trainingSets/{setId}`: 自分のみread/write可
3. Security Rulesデプロイ（`firebase deploy --only firestore:rules`）
4. 異常値テストケース追加（< 150ms, > 120s, 連続同一ms値）

**Deliverables**:
- ✅ 最低限の安全運用が可能（Security Rules適用済み）

---

## 段階1以降（TODO）

以下は段階0では実装しない機能（spec.mdとconstitutionで明確に除外）：

- **シーズン管理**: 暦（節気表示）、シーズン開始/終了
- **番付システム**: 正式記録の反映、番付計算、凍結/確定フロー
- **Scheduled Functions**: ランキング/番付の定期集計（Cloud Functions使用）
- **課金機能**: サブスクリプション、エントリー料金
- **称号システム**: 段位・称号の付与
- **解説ページ**: poem詳細ページ、作者詳細ページ

## Complexity Tracking

（Constitution Checkで違反なし - 記載不要）

## Next Steps

1. **Phase 0 - Research**: 技術調査（Firebase設定方法、Vite最適化、Tailwind最適化、計測精度検証）→ `research.md`生成
2. **Phase 1 - Design**: データモデル詳細化（Firestore型定義、バリデーション）→ `data-model.md`, `quickstart.md`生成
3. **Phase 2 - Tasks**: 実装タスク分解 → `/speckit.tasks`で`tasks.md`生成
4. **Phase 3 - Implementation**: `/speckit.implement`で実装開始
