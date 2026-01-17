# タスク: 段階0 - 競技かるた訓練プラットフォーム基盤構築

**入力**: `specs/001-phase0-foundation/` からの設計ドキュメントおよび憲法
**前提条件**: 憲法（.specify/memory/constitution.md）、plan.md、spec.md、data-model.md、contracts/

**テスト**: 段階0ではテスト実装は任意のため、テストタスクは含めていません。

**組織化**: タスクはユーザーストーリー（US1-US6）ごとにグループ化され、各ストーリーを独立して実装・テスト可能にします。

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1-US6）
- ファイルパスを明記

## パス規約

- **Webアプリ**: `apps/web/src/`、`apps/web/` はリポジトリルート
- Firebase設定: リポジトリルート
- Seed/スクリプト: リポジトリルート

---

## フェーズ1: セットアップ（共有インフラ）

**目的**: プロジェクトの初期化と基本構造の作成

- [ ] T001 リポジトリ構造を作成（apps/web, data, scripts ディレクトリ）
- [ ] T002 apps/web で Vite + React + TypeScript プロジェクトを初期化（`npm create vite@latest`）
- [ ] T003 [P] apps/web に react-router-dom をインストール
- [ ] T004 [P] apps/web に Firebase Web SDK をインストール（firebase パッケージ）
- [ ] T005 [P] apps/web に Tailwind CSS を導入（tailwindcss, postcss, autoprefixer）
- [ ] T006 [P] apps/web に ESLint と Prettier を設定
- [ ] T007 [P] リポジトリルートに tsx と dotenv を開発依存関係としてインストール
- [ ] T008 [P] リポジトリルートに firebase-admin をインストール（seedスクリプト用）

---

## フェーズ2: 基盤構築（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーが依存する基盤インフラの構築

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業は開始できません

- [ ] T009 apps/web/tailwind.config.js を作成（content paths設定、日本文化の色定義: sumi, gofun, beni, ai, yamabuki）
- [ ] T010 apps/web/postcss.config.js を作成（tailwindcss と autoprefixer プラグイン設定）
- [ ] T011 apps/web/src/index.css に Tailwind directives を追加（@tailwind base, components, utilities）
- [ ] T012 apps/web/.env.example を作成（Firebase環境変数テンプレート: VITE_FIREBASE_*）
- [ ] T013 apps/web/.gitignore を更新（.env, dist/, node_modules/ を追加）
- [ ] T014 apps/web/src/lib/firebase.ts を作成（Firebase初期化、環境変数から設定読み込み、Auth/Firestore client export）
- [ ] T015 apps/web/src/types/poem.ts を作成（Poem interface: poemId, order, yomi, yomiKana, tori, toriKana, kimarijiCount, kimariji, author）
- [ ] T016 apps/web/src/types/trainingSet.ts を作成（TrainingSet interface: setId, uid, mode, choiceCount, startedAt, endedAt, results, summary, isSuspicious）
- [ ] T017 firebase.json を作成（Hosting設定: public=apps/web/dist, SPA rewrite）
- [ ] T018 .firebaserc を作成（Firebase project ID設定）

**チェックポイント**: 基盤構築完了 - ユーザーストーリーの実装を並列開始可能

---

## フェーズ3: ユーザーストーリー1 - 札閲覧（めくり）（優先度: P1）🎯 MVP

**目標**: ログイン不要で、百人一首の札を閲覧し、読札→取札のめくり（裏返し）ができる

**独立テスト**: ブラウザで `http://localhost:5173/` にアクセス → Homeページ表示 → 「札を見る」ボタンクリック → `/cards` へ遷移 → 札カードをクリックして裏返し確認

### ユーザーストーリー1の実装

- [ ] T019 [P] [US1] apps/web/src/pages/HomePage.tsx を作成（サービス名、説明文、「札を見る」「訓練する」「成績を見る」ボタン、Tailwindでスタイリング）
- [ ] T020 [P] [US1] apps/web/src/pages/CardsPage.tsx を作成（基本構造、一時的に「Cards Page」テキスト表示）
- [ ] T021 [US1] apps/web/src/App.tsx を作成（BrowserRouter設定、Routes: `/` → HomePage, `/cards` → CardsPage, `/training` → TrainingPage, `/results` → ResultsPage, `/login` → LoginPage）
- [ ] T022 [US1] apps/web/src/main.tsx を更新（App componentをrenderしているか確認、React StrictModeでApp componentをマウント）
- [ ] T023 [US1] apps/web/index.html を確認（Viteのエントリポイントが src/main.tsx を参照しているか確認）
- [ ] T024 [P] [US1] apps/web/src/components/FlipCard.tsx を作成（めくり機能付きカードコンポーネント、クリックでyomi/toriを切り替え、ひらがな表示切替ボタン）
- [ ] T025 [US1] apps/web/src/pages/CardsPage.tsx を更新（Firestore接続、poems取得、FlipCardコンポーネントをgridレイアウトで表示、8枚/16枚/100枚表示切替）

**チェックポイント**: ユーザーストーリー1完了 - 札閲覧とめくり機能が動作

---

## フェーズ4: ユーザーストーリー2 - 認証機能（優先度: P2）

**目標**: Google認証または匿名認証でログイン/ログアウトができ、認証状態を管理できる

**独立テスト**: `/login` にアクセス → Googleログインボタンクリック → ログイン成功 → Homeに戻る → ログアウト確認

### ユーザーストーリー2の実装

- [ ] T026 [P] [US2] apps/web/src/contexts/AuthContext.tsx を作成（認証状態管理、useAuth hook提供）
- [ ] T027 [P] [US2] apps/web/src/pages/LoginPage.tsx を作成（Googleログインボタン、匿名ログインボタン、Tailwindでスタイリング）
- [ ] T028 [US2] apps/web/src/App.tsx を更新（AuthContextでラップ、PrivateRoute作成）
- [ ] T029 [US2] apps/web/src/components/Header.tsx を作成（ログイン状態表示、ログアウトボタン、ナビゲーションメニュー）
- [ ] T030 [US2] apps/web/src/pages/HomePage.tsx を更新（Headerコンポーネント追加、ログイン状態に応じて「訓練する」「成績を見る」ボタンの表示/非表示）
- [ ] T031 [US2] firestore.rules を作成（poems read許可、users/{uid} 本人のみread/write許可）

**チェックポイント**: ユーザーストーリー2完了 - 認証機能が動作、ログイン後のみ訓練・成績にアクセス可能

---

## フェーズ5: ユーザーストーリー3 - 歌データの投入（優先度: P3）

**目標**: `npm run seed:poems` コマンドでFirestoreに100件のpoemsをupsert

**独立テスト**: `npm run seed:poems` を実行 → コンソールに「✅ Seeded 100 poems successfully.」表示 → Firestore Consoleで100件のドキュメント確認

### ユーザーストーリー3の実装

- [ ] T032 [P] [US3] data/poems.seed.json を確認（既存の100件データがyomi/tori形式で正しく構造化されているか検証）
- [ ] T033 [US3] scripts/seed_poems.ts を作成（Firebase Admin初期化、.envから設定読み込み、poems.seed.jsonを読み込み、setDoc with merge: true でupsert、Promise.allで並列実行、成功/失敗カウントをログ出力）
- [ ] T034 [US3] リポジトリルートの package.json に `seed:poems` スクリプトを追加（`tsx scripts/seed_poems.ts`）
- [ ] T035 [US3] .env.example をリポジトリルートに作成（FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS などAdmin SDK用の環境変数テンプレート）

**チェックポイント**: ユーザーストーリー3完了 - Seedコマンドが正常に動作

---

## フェーズ6: ユーザーストーリー4 - 決まり字別訓練（優先度: P1）🎯 MVP核心機能

**目標**: ログイン後、決まり字数でフィルタし、8択/16択の多択問題で訓練でき、clientElapsedMsを計測できる

**独立テスト**: ログイン → `/training` にアクセス → 決まり字数選択（例: 1文字）→ 8択選択 → 訓練開始 → 読札表示 → 取札を選択 → 正誤判定と経過時間表示 → 10問完了

### ユーザーストーリー4の実装

- [ ] T036 [P] [US4] apps/web/src/pages/TrainingPage.tsx を作成（基本構造、未ログイン時はLoginPageへリダイレクト）
- [ ] T037 [P] [US4] apps/web/src/components/TrainingSetup.tsx を作成（決まり字数フィルタ選択、8択/16択選択、問題数選択、開始ボタン）
- [ ] T038 [P] [US4] apps/web/src/components/TrainingQuestion.tsx を作成（読札表示、8/16択の取札候補表示、選択ボタン、タイマー表示）
- [ ] T039 [US4] apps/web/src/hooks/useTrainingSession.ts を作成（訓練セッション管理、問題生成ロジック、clientElapsedMs計測、正誤判定）
- [ ] T040 [US4] apps/web/src/pages/TrainingPage.tsx を更新（TrainingSetup/TrainingQuestionコンポーネント統合、状態管理）
- [ ] T041 [US4] apps/web/src/utils/poemUtils.ts を作成（決まり字フィルタリング、ランダム問題生成、ダミー選択肢生成）

**チェックポイント**: ユーザーストーリー4完了 - 訓練モードが動作、計測が正確

---

## フェーズ7: ユーザーストーリー5 - 記録保存（優先度: P1）🎯 MVP核心機能

**目標**: 訓練完了後、結果をFirestoreの `/users/{uid}/sets/{setId}` に保存し、異常値判定を行う

**独立テスト**: 訓練完了 → 結果保存 → Firestore Consoleで `/users/{uid}/sets/{setId}` にドキュメントが作成されたことを確認 → isSuspiciousフィールド確認

### ユーザーストーリー5の実装

- [ ] T042 [P] [US5] apps/web/src/utils/anomalyDetection.ts を作成（異常値判定ロジック: 極端に短いms、連続同一ms、総時間と合計ms乖離）
- [ ] T043 [US5] apps/web/src/hooks/useTrainingSession.ts を更新（訓練完了時にFirestoreへ保存、summary計算、isSuspicious判定）
- [ ] T044 [US5] apps/web/src/pages/TrainingPage.tsx を更新（保存成功/失敗のUI表示、エラーハンドリング）
- [ ] T045 [US5] firestore.rules を更新（users/{uid}/sets/{setId} 作成のみ許可、更新禁止、本人のみread許可）

**チェックポイント**: ユーザーストーリー5完了 - 訓練結果がFirestoreに正しく保存され、異常値判定が動作

---

## フェーズ8: ユーザーストーリー6 - 成績閲覧（優先度: P2）

**目標**: ログイン後、自分の訓練履歴（最新20件）と苦手抽出（平均ms遅い上位10首、誤答多い上位10首）を閲覧できる

**独立テスト**: ログイン → `/results` にアクセス → セット一覧表示確認 → セット詳細クリック → 各問の結果表示確認 → 苦手抽出表示確認

### ユーザーストーリー6の実装

- [ ] T046 [P] [US6] apps/web/src/pages/ResultsPage.tsx を作成（基本構造、未ログイン時はLoginPageへリダイレクト）
- [ ] T047 [P] [US6] apps/web/src/components/SetListItem.tsx を作成（セット一覧の1項目、日時/8or16/正答数/平均ms表示）
- [ ] T048 [P] [US6] apps/web/src/components/SetDetail.tsx を作成（セット詳細、各問のms/正誤表示、グラフ表示）
- [ ] T049 [P] [US6] apps/web/src/components/WeakPointsAnalysis.tsx を作成（苦手抽出、平均ms遅い上位10首、誤答多い上位10首）
- [ ] T050 [US6] apps/web/src/hooks/useUserResults.ts を作成（Firestoreから自分のセット取得、最新20件フィルタ、苦手抽出ロジック）
- [ ] T051 [US6] apps/web/src/pages/ResultsPage.tsx を更新（SetListItem/SetDetail/WeakPointsAnalysisコンポーネント統合）

**チェックポイント**: ユーザーストーリー6完了 - 成績閲覧機能が動作、苦手抽出が正確

---

## フェーズ9: 仕上げと横断的関心事

**目的**: すべてのユーザーストーリーに影響する改善とドキュメント整備

- [ ] T052 [P] apps/web の package.json に npm scripts を追加（dev, build, preview, lint, format）
- [ ] T053 [P] apps/web/.eslintrc.cjs と .prettierrc を作成（基本的なルール設定）
- [ ] T054 README.md を作成（プロジェクト概要、前提条件、セットアップ手順、Seed投入、ローカル開発、ビルド、デプロイ手順）
- [ ] T055 [P] apps/web/src/utils/costGuard.ts を作成（コストガード: ユーザーあたりセット保存上限、クエリ最適化）
- [ ] T056 apps/web で `npm run build` を実行してビルドが成功することを確認
- [ ] T057 `firebase deploy --only firestore:rules` を実行してFirestore Rulesをデプロイ
- [ ] T058 `firebase deploy --only hosting` を実行してHostingにデプロイ
- [ ] T059 受け入れテストを実施（README手順に従ってseed→dev→login→訓練→成績→build→deploy→Hosting URL確認）

---

## 依存関係と実行順序

### フェーズの依存関係

- **セットアップ（フェーズ1）**: 依存なし - すぐに開始可能
- **基盤構築（フェーズ2）**: セットアップ完了に依存 - すべてのユーザーストーリーをブロック
- **ユーザーストーリー（フェーズ3-8）**: すべて基盤構築フェーズ完了に依存
  - US1（札閲覧）: 基盤構築完了後に開始可能 - 他のストーリーへの依存なし（MVP最優先）
  - US2（認証）: 基盤構築完了後に開始可能 - US1と並列実行可能
  - US3（Seed）: 基盤構築完了後に開始可能 - US1の前提として必要（先に実装推奨）
  - US4（訓練）: US2（認証）完了に依存（ログイン必須）、US3（Seed）完了に依存（問題データ必要）
  - US5（記録保存）: US2（認証）とUS4（訓練）完了に依存
  - US6（成績閲覧）: US2（認証）とUS5（記録保存）完了に依存
- **仕上げ（フェーズ9）**: すべてのユーザーストーリー完了に依存

### ユーザーストーリーの依存関係

- **US1（札閲覧）**: 基盤構築（フェーズ2）完了後に開始 - 他のストーリーへの依存なし
- **US2（認証）**: 基盤構築（フェーズ2）完了後に開始 - US1と並列実行可能
- **US3（Seed）**: 基盤構築（フェーズ2）完了後に開始 - US1と並列実行可能
- **US4（訓練）**: US2（認証）とUS3（Seed）完了に依存
- **US5（記録保存）**: US2（認証）とUS4（訓練）完了に依存
- **US6（成績閲覧）**: US2（認証）とUS5（記録保存）完了に依存

### 各ユーザーストーリー内の順序

- **US1（札閲覧）**: HomePage/CardsPage作成 → ルーティング設定 → FlipCard作成 → CardsPage更新
- **US2（認証）**: AuthContext作成 → LoginPage作成 → App更新 → Header作成 → HomePage更新 → Firestore Rules作成
- **US3（Seed）**: seedデータ確認 → seedスクリプト作成 → package.json更新 → .env.example作成
- **US4（訓練）**: TrainingPage作成 → TrainingSetup/TrainingQuestion作成 → useTrainingSession作成 → TrainingPage更新 → poemUtils作成
- **US5（記録保存）**: anomalyDetection作成 → useTrainingSession更新 → TrainingPage更新 → Firestore Rules更新
- **US6（成績閲覧）**: ResultsPage作成 → SetListItem/SetDetail/WeakPointsAnalysis作成 → useUserResults作成 → ResultsPage更新

### 並列実行の機会

- **セットアップ（フェーズ1）**: T003-T008 は並列実行可能（異なる依存関係のインストール）
- **基盤構築（フェーズ2）**: T009-T018 の一部は並列実行可能（異なるファイル作成）
- **US1（札閲覧）**: T019, T020 は並列実行可能（異なるページコンポーネント）、T024は独立して作成可能
- **US2（認証）**: T026, T027 は並列実行可能（異なるファイル）
- **US3（Seed）**: T032, T033, T035 は並列実行可能（データ確認、スクリプト作成、環境変数テンプレート）
- **US4（訓練）**: T036, T037, T038, T041 は並列実行可能（異なるファイル）
- **US5（記録保存）**: T042は独立して作成可能
- **US6（成績閲覧）**: T046, T047, T048, T049 は並列実行可能（異なるファイル）
- **仕上げ（フェーズ9）**: T052, T053, T054, T055 は並列実行可能（異なるファイル作成）

---

## 実装戦略

### MVP最優先（US1 + US3のみ）

1. フェーズ1を完了: セットアップ
2. フェーズ2を完了: 基盤構築（重要 - すべてのストーリーをブロック）
3. フェーズ5を完了: US3（Seed）- データ投入
4. フェーズ3を完了: US1（札閲覧）
5. **停止して検証**: US1を独立してテスト（札閲覧とめくり機能）
6. デモ可能な状態

### 段階0完全版（全US）

1. セットアップ + 基盤構築 → 基盤準備完了
2. US3（Seed）を追加 → 独立してテスト
3. US1（札閲覧）を追加 → 独立してテスト → デモ（MVP！）
4. US2（認証）を追加 → 独立してテスト
5. US4（訓練）を追加 → 独立してテスト → デモ（訓練機能）
6. US5（記録保存）を追加 → 独立してテスト
7. US6（成績閲覧）を追加 → 独立してテスト → デモ（段階0完成！）
8. 各ストーリーが独立して価値を提供

### 並列チーム戦略

複数の開発者がいる場合:

1. チーム全体でセットアップ + 基盤構築を完了
2. 基盤構築完了後:
   - 開発者A: US3（Seed）→ US1（札閲覧）
   - 開発者B: US2（認証）
   - 開発者C: US4（訓練）のUIコンポーネント先行作成
3. US2とUS3完了後:
   - 開発者A: US6（成績閲覧）
   - 開発者B: US4（訓練）のロジック統合
   - 開発者C: US5（記録保存）
4. ストーリーを独立して完成・統合

---

## 注意事項

- **[P]** タスク = 異なるファイル、依存関係なし
- **[Story]** ラベルで特定のユーザーストーリーへのタスクマッピング
- 各ユーザーストーリーは独立して完成・テスト可能
- タスク完了後またはグループ完了後にコミット
- チェックポイントで各ストーリーを独立して検証
- 避けるべき: 曖昧なタスク、同じファイルへの競合、ストーリー間の依存関係（独立性を損なう）

---

## 検証チェックリスト

段階0完了の確認（憲法のゴール達成）:

- [ ] ログイン無しで「札閲覧（めくり）」ができる（US1）
  - [ ] 札一覧が表示される
  - [ ] 札をクリックすると yomi ⇔ tori が切り替わる
  - [ ] ひらがな表示切替（yomiKana/toriKana）が動作する

- [ ] ログイン後に「決まり字別の訓練（多択）」ができる（US2, US4）
  - [ ] Google認証または匿名認証でログインできる
  - [ ] 決まり字数でフィルタできる
  - [ ] 8択/16択を選択できる
  - [ ] 読札が表示され、取札候補から選択できる
  - [ ] 正誤判定が正確に動作する

- [ ] 解答時間（clientElapsedMs）をフロントで計測し、Firestoreへ保存できる（US5）
  - [ ] 問題表示から解答までの時間が正確に計測される
  - [ ] `/users/{uid}/sets/{setId}` に結果が保存される
  - [ ] 異常値判定（isSuspicious）が動作する

- [ ] 成績（自分の履歴・簡易集計）を閲覧できる（US6）
  - [ ] セット一覧（最新20件）が表示される
  - [ ] セット詳細（各問のms、正誤）が表示される
  - [ ] 苦手抽出（平均ms遅い上位10首、誤答多い上位10首）が表示される

- [ ] その他
  - [ ] `npm i` → `npm run dev` で動作する
  - [ ] `npm run seed:poems` で100件のpoemsが投入できる
  - [ ] `npm run build` が成功し、Firebase Hosting にデプロイできる
  - [ ] READMEの手順が第三者によって再現可能である
