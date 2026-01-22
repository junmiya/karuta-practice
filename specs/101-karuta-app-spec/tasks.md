# Tasks: 百人一首競技カルタアプリ完全仕様

**Input**: Design documents from `/specs/101-karuta-app-spec/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/submitOfficialSession.md, quickstart.md

**Tests**: Tests are NOT explicitly requested for this feature. Integration testing will be done via quickstart.md scenarios.

**Organization**: Tasks are grouped by user story (US1-US5) to enable independent implementation and testing of each story.

---

## 進捗サマリー (2026-01-22 更新)

| 段階 | 説明 | 完了率 | 状態 |
|------|------|--------|------|
| **段階0** | 基本機能・公式競技・番付 | **90%** | ほぼ完了 |
| **段階1** | 自動運用・称号・高度機能 | **50%** | 進行中 |

### 本番環境

| 環境 | URL | 状態 |
|------|-----|------|
| 本番 | https://karuta-banzuke.web.app | ✅ 稼働中 |
| Functions | karuta-banzuke | ✅ デプロイ済 |
| Firestore | karuta-banzuke | ✅ 稼働中 |

---

## 最近の完了項目 (2026-01-22)

| コミット | 項目 | ファイル |
|----------|------|----------|
| 387bd6a | AdminPageをkaruta-containerに統一 | AdminPage.tsx |
| 387bd6a | PracticePageのContainer未定義エラー修正 | PracticePage.tsx |
| 387bd6a | 未使用コード削除（lint修正） | KimarijiSelector.tsx, KeikoPage.tsx |
| 387bd6a | ロック絵文字をカスタムアイコンに変更 | Header.tsx, JapaneseLock.tsx |
| c07c922 | ビューポートベース札サイズとページレイアウト統一 | CardSizeProvider, index.css |
| c07c922 | 札サイズ縮小（max-width: 600px/800px） | index.css |
| c07c922 | 取札5文字改行・3行表示統一 | ToriText.tsx |
| c07c922 | 決まり字ハイライト修正（ひらがな時のみ） | PoemCard.tsx |
| c07c922 | KensanPage → KeikoPage リネーム | KeikoPage.tsx |
| c07c922 | KimarijiSelector 1行コンパクトモード | KimarijiSelector.tsx |
| (latest) | レスポンシブ最適化（フォントサイズ・グリッド） | index.css, CardSizeProvider |
| (latest) | 鍵アイコンの和錠化（SVG） | Header.tsx, JapaneseLock.tsx |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/src/`
- **Backend (Functions)**: `functions/src/`
- **Static Data**: `data/`
- **Firebase Config**: Repository root (`firestore.rules`, `firestore.indexes.json`)

---

## Phase 1: Setup (Firebase基盤) ✅ 完了

**Purpose**: Firebaseプロジェクト初期設定とFirestoreスキーマ作成

- [x] T001 Firebaseプロジェクト作成、Blazeプラン有効化、Auth/Firestore/Functions/Hosting/Scheduler初期設定
- [x] T002 [P] Create Firestore collections schema definitions in `functions/src/types/firestore.ts`
- [x] T003 [P] Create Firestore indexes in `firestore.indexes.json`
- [x] T004 [P] Initialize apps/web project with Vite + React 18 + TypeScript in `apps/web/`
- [x] T005 [P] Initialize Cloud Functions project with TypeScript in `functions/`
- [x] T006 Create Firebase configuration and initialization in `apps/web/src/services/firebase.ts`

---

## Phase 2: Foundational (UI共通化・デザイン・認証) ✅ 完了

**Purpose**: 全タブで共通利用するUIコンポーネントとデザインシステムの構築

### デザインシステム

- [x] T007 Define design rules (余白/文字階層/最大行幅/色/状態表示) in `apps/web/src/index.css`
- [x] T008 [P] Configure Tailwind CSS with design tokens in `apps/web/tailwind.config.js`

### 共通コンポーネント

- [x] T009 [P] Create Layout component (Header + Content) in `apps/web/src/components/Layout.tsx`
- [x] T010 [P] Create Header component (学習/稽古/競技/番付タブ) in `apps/web/src/components/Header.tsx`
- [x] T011 [P] Create ControlBar component (ひらがな/決まり字/覚えた/シャッフル) in `apps/web/src/components/ControlBar.tsx`
- [x] T012 [P] Create PoemCard component (73:52比率固定、ToriText改行表示) in `apps/web/src/components/PoemCard.tsx`
- [x] T013 [P] Create KarutaGrid component (12枚固定、向きで4×3/3×4切替) in `apps/web/src/components/KarutaGrid.tsx`
- [x] T014 [P] Create PageStates components (loading/empty/error) in `apps/web/src/components/ui/PageStates.tsx`
- [x] T015 [P] Create Button component in `apps/web/src/components/ui/Button.tsx`
- [x] T016 [P] Create Card component in `apps/web/src/components/ui/Card.tsx`
- [x] T017 [P] Create KimarijiSelector component (1行コンパクトモード対応) in `apps/web/src/components/KimarijiSelector.tsx`
- [x] T017a [P] Create ToriText component (5文字改行・3行表示) in `apps/web/src/components/ToriText.tsx`
- [x] T017b [P] Create CardSizeProvider (ビューポートベース札サイズ) in `apps/web/src/components/CardSizeProvider.tsx`

### 認証基盤

- [x] T018 Create AuthContext for authentication state management in `apps/web/src/contexts/AuthContext.tsx`
- [x] T019 Implement auth service (login/logout/session) in `apps/web/src/services/auth.service.ts`

### 型定義

- [x] T020 [P] Create Poem type definitions in `apps/web/src/types/poem.ts`
- [x] T021 [P] Create Session type definitions in `apps/web/src/types/session.ts`
- [x] T022 [P] Create Ranking type definitions in `apps/web/src/types/ranking.ts`
- [x] T023 [P] Create User type definitions in `apps/web/src/types/user.ts`

### ルーティング

- [x] T024 Setup react-router-dom with tab navigation in `apps/web/src/App.tsx`

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 学習タブで札を閲覧して覚える (Priority: P1) 🎯 MVP ✅ 完了

**Goal**: ゲストユーザーが札一覧を閲覧し、決まり字フィルタ・ひらがな切替・シャッフルを操作できる

### Implementation for User Story 1

- [x] T025 [P] [US1] Create poems.json (100首データ) in `apps/web/src/data/poems.json`
- [x] T026 [P] [US1] poems.service.ts でデータ読み込み in `apps/web/src/services/poems.service.ts`
- [x] T027 [US1] Create usePoems hook (札データ読み込み・フィルタ・シャッフル) in `apps/web/src/hooks/usePoems.ts`
- [x] T028 [US1] Create karuta utility functions in `apps/web/src/utils/karuta.ts`
- [x] T029 [US1] Implement HomePage (学習タブ) with KarutaGrid and ControlBar in `apps/web/src/pages/HomePage.tsx`
- [x] T030 [US1] Implement ひらがな切替 (yomi/tori ↔ kana) functionality
- [x] T031 [US1] Implement KimarijiSelector filter logic (1-6字選択) in `apps/web/src/components/KimarijiSelector.tsx`
- [x] T032 [US1] Implement シャッフル (フィルタ維持して12枚再抽選)
- [x] T033 [US1] Add orientation-based grid CSS (4×3/3×4 auto-switch) in `apps/web/src/index.css`
- [x] T033a [US1] Implement 決まり字ハイライト（ひらがな表示時のみ）

**Checkpoint**: ✅ User Story 1 complete - ゲストユーザーが学習タブを利用可能

---

## Phase 4: User Story 5 - シーズンにエントリーする (Priority: P5, but dependency for US3) ✅ 完了

**Goal**: ログインユーザーがシーズンにエントリーできる（競技機能の前提条件）

### Implementation for User Story 5

- [x] T034 [P] [US5] Create Entry type definitions in `apps/web/src/types/entry.ts`
- [x] T035 [P] [US5] Create Season type definitions in `apps/web/src/types/entry.ts`
- [x] T036 [US5] Create Firestore service for entries/seasons in `apps/web/src/services/entry.service.ts`
- [x] T037 [US5] Implement EntryPage (エントリー画面) with division selection in `apps/web/src/pages/EntryPage.tsx`
- [x] T038 [US5] Implement entry validation (級位/段位選択)
- [x] T039 [US5] Create ProfilePage for nickname management in `apps/web/src/pages/ProfilePage.tsx`

**Checkpoint**: ✅ User Story 5 complete - ユーザーがシーズンにエントリー可能

---

## Phase 5: User Story 2 - 稽古タブでクイズ形式の練習をする (Priority: P2) ✅ 完了

**Goal**: ログインユーザーが決まり字数を選択してクイズ練習、成績を個人統計として記録

**Note**: 研鑽タブは「稽古」タブにリネーム済み

### Implementation for User Story 2

- [x] T040 [P] [US2] Create stats types in `apps/web/src/types/stats.ts`
- [x] T041 [US2] Create usePracticeSession hook (クイズロジック・タイミング計測) in `apps/web/src/hooks/usePracticeSession.ts`
- [x] T042 [US2] Implement KeikoPage (稽古タブ) with stats UI in `apps/web/src/pages/KeikoPage.tsx`
- [x] T043 [US2] Implement quiz result summary display in `apps/web/src/pages/ResultPage.tsx`
- [x] T044 [US2] Implement stats save to Firestore in `apps/web/src/services/stats.service.ts`
- [x] T045 [US2] Create choice generation logic (8択) in `apps/web/src/services/practice.service.ts`
- [x] T045a [US2] Implement PracticePage (練習モード10問) in `apps/web/src/pages/PracticePage.tsx`
- [x] T045b [US2] Implement 12枚実戦形式の稽古モード

**Checkpoint**: ✅ User Story 2 complete - ユーザーが稽古タブでクイズ練習可能

---

## Phase 6: User Story 3 - 競技タブで公式競技セッションを実施する (Priority: P3) ✅ 完了

**Goal**: エントリー済みユーザーが50問の公式競技を実施し、サーバー確定で番付に反映

### Implementation for User Story 3

- [x] T046 [P] [US3] Create Session types in `apps/web/src/types/session.ts`
- [x] T047 [US3] Create useOfficialSession hook in `apps/web/src/hooks/useOfficialSession.ts`
- [x] T048 [US3] Implement CompetitionPage (競技タブ) in `apps/web/src/pages/CompetitionPage.tsx`
- [x] T049 [US3] Implement session Firestore operations in `apps/web/src/services/session.service.ts`
- [x] T050 [US3] Implement CompetitionSessionPage (公式競技画面) in `apps/web/src/pages/CompetitionSessionPage.tsx`
- [x] T051 [US3] Implement session flow (50問・タイマー)

### Callable Function (サーバー確定処理)

- [x] T052 [US3] Create sessionValidator (異常検知ルール 5種類以上) in `functions/src/validators/`
- [x] T053 [US3] Create scoring utility in `functions/src/utils/scoring.ts`
- [x] T054 [US3] Implement submitOfficialSession Callable Function in `functions/src/`
- [x] T055 [US3] Connect Callable Function to client submit flow
- [x] T056 [US3] Implement invalid session display (参考記録表示)

**Checkpoint**: ✅ User Story 3 complete - 公式競技セッションの実施から確定まで動作

---

## Phase 7: User Story 4 - 成績・番付タブで個人成績と番付を閲覧する (Priority: P4) 🔄 85%

**Goal**: ログインユーザーが個人成績と公式番付を閲覧できる

**Note**: 成績機能は稽古タブに統合、番付タブを独立

### Implementation for User Story 4

- [x] T057 [US4] Implement KeikoPage (稽古タブ) with personal stats section in `apps/web/src/pages/KeikoPage.tsx`
- [x] T058 [US4] Implement personal stats display (正解率/平均/決まり字別)
- [x] T059 [US4] Implement BanzukePage (番付タブ) in `apps/web/src/pages/BanzukePage.tsx`
- [x] T060 [US4] Implement 暫定/公式/本日の番付表示
- [x] T061 [US4] Create rankings service in `apps/web/src/services/ranking.service.ts`
- [ ] T061a [US4] 成績ページのグラフ追加（日別推移のビジュアル化）

**Checkpoint**: 🔄 User Story 4 mostly complete - 番付表示完了、グラフ追加待ち

---

## Phase 8: Scheduled Functions & Security 🔄 70%

**Purpose**: 番付キャッシュ更新、Security Rules、コストガード

### Scheduled Function

- [x] T062 Implement updateRankingsCache Scheduled Function in `functions/src/scheduled/`
- [x] T063 Implement generateDailyReflections (日次集計) in `functions/src/scheduled/`
- [x] T064 Register scheduled functions in `functions/src/index.ts`
- [ ] T064a ⚠️ Scheduled Functions本番デプロイ（要テスト）
- [ ] T064b ⚠️ シーズン自動遷移テスト（open→frozen→finalized）

### Security Rules

- [x] T065 Create Firestore Security Rules in `firestore.rules`
- [x] T066 Implement auditService (監査ログ) in `functions/src/services/auditService.ts`

### Cost Guard

- [x] T067 Implement costGuard in `functions/src/services/costGuard.ts`
- [x] T068 Ensure cache-first strategy throughout the application

**Checkpoint**: 🔄 Backend infrastructure mostly complete - デプロイ・テスト待ち

---

## 段階1延期項目（Not in Scope）

以下の要件は段階1で実装予定：

| 要件 | 内容 |
|------|------|
| FR-039 | 名人称号（4回達成） |
| FR-040 | 永世称号（8回達成） |
| FR-041 | 参加者24名未満の除外条件 |
| FR-042 | 参加者の定義（10回達成） |

関連: 憲法 原則17（称号ルール）

---

## Phase 9: 覚えた機能 (learned) ✅ 完了

**Purpose**: 覚えたボタンの永続化（ログイン時のみ）

- [x] T069 [US1] Implement userLearned Firestore operations in `apps/web/src/services/learned.service.ts`
- [x] T070 [US1] Connect 覚えた button to save (ログイン時) in HomePage
- [x] T071 [US1] Implement learned filter in usePoems hook

**Checkpoint**: ✅ 覚えた機能の永続化完了

---

## Phase 10: Polish & Cross-Cutting Concerns 🔄 60%

**Purpose**: 品質向上と最終確認

- [x] T072 札サイズ最適化 (max-width: 600px/800px)
- [x] T073 [P] Performance optimization (札一覧表示 < 3秒, クイズ判定 < 100ms)
- [x] T074 [P] Responsive design (karuta-container統一、ビューポートベース札サイズ)
- [x] T075 [P] UI改善 (ToriText 5文字改行、決まり字ハイライト)
- [x] T076 Firebase deploy (Hosting, Functions デプロイ済)
- [ ] T077 スペーシング・デザイン統一（各ページの余白調整）
- [x] T078 レスポンシブ最適化確認（スマホ/タブレット/PC）
- [ ] T079 称号システム検証（名人/永世称号付与）
- [ ] T080 UI競技ロック（公式中の設定変更禁止）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP delivery
- **User Story 5 (Phase 4)**: Depends on Foundational - Required before US3
- **User Story 2 (Phase 5)**: Depends on Foundational - Can run parallel with US5
- **User Story 3 (Phase 6)**: Depends on US5 (entry required for official competition)
- **User Story 4 (Phase 7)**: Depends on US3 (needs sessions for stats) and Scheduled Functions
- **Scheduled/Security (Phase 8)**: Can start after US3 basics are done
- **Learned (Phase 9)**: Can run parallel with US2-US4
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
    ├─→ Phase 3 (US1: 学習) → 🎯 MVP
    │       ↓
    │   Phase 9 (覚えた永続化)
    │
    ├─→ Phase 4 (US5: エントリー)
    │       ↓
    │   Phase 6 (US3: 競技)
    │       ↓
    │   Phase 8 (Scheduled/Security)
    │       ↓
    │   Phase 7 (US4: 成績)
    │
    └─→ Phase 5 (US2: 研鑽) [parallel]
            ↓
        Phase 10 (Polish)
```

### Within Each User Story

- Types/Models before hooks/services
- Hooks before pages
- Core implementation before integrations
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks T002-T005 marked [P] can run in parallel
- All Foundational component tasks T009-T017 marked [P] can run in parallel
- All type definition tasks T020-T023 marked [P] can run in parallel
- US1 and US5 can start in parallel after Foundational
- US2 can run in parallel with US5/US3
- Phase 9 (learned) can run parallel with US2-US4

---

## Parallel Example: Foundational Components

```bash
# Launch all component tasks together:
Task: "Create AppShell component in apps/web/src/components/AppShell.tsx"
Task: "Create TabNav component in apps/web/src/components/TabNav.tsx"
Task: "Create ControlBar component in apps/web/src/components/ControlBar.tsx"
Task: "Create PoemCard component in apps/web/src/components/PoemCard.tsx"
Task: "Create CardGrid component in apps/web/src/components/CardGrid.tsx"
Task: "Create StateViews components in apps/web/src/components/StateViews.tsx"
Task: "Create Button component in apps/web/src/components/Button.tsx"
Task: "Create Card component in apps/web/src/components/Card.tsx"
Task: "Create KimarijiSelector component in apps/web/src/components/KimarijiSelector.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T024)
3. Complete Phase 3: User Story 1 (T025-T033)
4. **STOP and VALIDATE**: Test with quickstart.md シナリオ1
5. Deploy to Firebase Hosting if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Deploy (MVP! 学習タブ動作)
3. Add US5 → Test → Entry flow working
4. Add US3 + Phase 8 → Test → Official competition working
5. Add US4 → Test → Stats and banzuke visible
6. Add US2 → Test → Training mode working
7. Add Phase 9 → Test → Learned persistence working
8. Polish → Final validation → Production ready

### Task Summary

| Phase | Description | 完了 | 残り | 状態 |
|-------|-------------|------|------|------|
| Phase 1 | Setup | 6/6 | 0 | ✅ |
| Phase 2 | Foundational | 20/20 | 0 | ✅ |
| Phase 3 | US1 学習 | 10/10 | 0 | ✅ |
| Phase 4 | US5 エントリー | 6/6 | 0 | ✅ |
| Phase 5 | US2 稽古 | 8/8 | 0 | ✅ |
| Phase 6 | US3 競技 | 11/11 | 0 | ✅ |
| Phase 7 | US4 成績・番付 | 5/6 | 1 | 🔄 |
| Phase 8 | Scheduled/Security | 6/8 | 2 | 🔄 |
| Phase 9 | 覚えた機能 | 3/3 | 0 | ✅ |
| Phase 10 | Polish | 5/9 | 4 | 🔄 |
| **Total** | | **80/87** | **7** | **92%** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Cost guard: 月1万円上限を遵守（キャッシュ参照徹底）
- Performance targets: 札一覧 < 3秒, クイズ判定 < 100ms, セッション確定 < 10秒, 番付表示 < 2秒

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-01-22 | 進捗サマリー追加、完了タスク更新（92%完了） |
| 2026-01-22 | UI統一（karuta-container、札サイズ最適化）完了 |
| 2026-01-22 | 研鑽→稽古リネーム反映 |
