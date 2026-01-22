# Tasks: 百人一首競技カルタアプリ完全仕様

**Input**: Design documents from `/specs/101-karuta-app-spec/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/submitOfficialSession.md, quickstart.md

**Tests**: Tests are NOT explicitly requested for this feature. Integration testing will be done via quickstart.md scenarios.

**Organization**: Tasks are grouped by user story (US1-US5) to enable independent implementation and testing of each story.

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

## Phase 1: Setup (Firebase基盤)

**Purpose**: Firebaseプロジェクト初期設定とFirestoreスキーマ作成

- [ ] T001 Firebaseプロジェクト作成、Blazeプラン有効化、Auth/Firestore/Functions/Hosting/Scheduler初期設定
- [ ] T002 [P] Create Firestore collections schema definitions in `functions/src/types/firestore.ts`
- [ ] T003 [P] Create Firestore indexes in `firestore.indexes.json`
- [ ] T004 [P] Initialize apps/web project with Vite + React 18 + TypeScript in `apps/web/`
- [ ] T005 [P] Initialize Cloud Functions project with TypeScript in `functions/`
- [ ] T006 Create Firebase configuration and initialization in `apps/web/src/services/firebase.ts`

---

## Phase 2: Foundational (UI共通化・デザイン・認証)

**Purpose**: 全タブで共通利用するUIコンポーネントとデザインシステムの構築

**⚠️ CRITICAL**: この基盤が完成するまでユーザーストーリーの実装は開始不可

### デザインシステム

- [ ] T007 Define design rules (余白/文字階層/最大行幅/色/状態表示) in `apps/web/src/styles/design-tokens.css`
- [ ] T008 [P] Configure Tailwind CSS with design tokens in `apps/web/tailwind.config.js`

### 共通コンポーネント

- [ ] T009 [P] Create AppShell component (Header + TabNav + Content) in `apps/web/src/components/AppShell.tsx`
- [ ] T010 [P] Create TabNav component (学習/研鑽/競技/成績) in `apps/web/src/components/TabNav.tsx`
- [ ] T011 [P] Create ControlBar component (ひらがな/決まり字/覚えた/シャッフル) in `apps/web/src/components/ControlBar.tsx`
- [ ] T012 [P] Create PoemCard component (73:52比率固定、Tokensで改行表示) in `apps/web/src/components/PoemCard.tsx`
- [ ] T013 [P] Create CardGrid component (12枚固定、向きで4×3/3×4切替) in `apps/web/src/components/CardGrid.tsx`
- [ ] T014 [P] Create StateViews components (loading/empty/error) in `apps/web/src/components/StateViews.tsx`
- [ ] T015 [P] Create Button component in `apps/web/src/components/Button.tsx`
- [ ] T016 [P] Create Card component in `apps/web/src/components/Card.tsx`
- [ ] T017 [P] Create KimarijiSelector component skeleton (props interface, basic layout) in `apps/web/src/components/KimarijiSelector.tsx`

### 認証基盤

- [ ] T018 Create AuthContext for authentication state management in `apps/web/src/contexts/AuthContext.tsx`
- [ ] T019 Implement auth service (login/logout/session) in `apps/web/src/services/auth.ts`

### 型定義

- [ ] T020 [P] Create Poem type definitions in `apps/web/src/types/poem.ts`
- [ ] T021 [P] Create Session type definitions in `apps/web/src/types/session.ts`
- [ ] T022 [P] Create Ranking type definitions in `apps/web/src/types/ranking.ts`
- [ ] T023 [P] Create User type definitions in `apps/web/src/types/user.ts`

### ルーティング

- [ ] T024 Setup react-router-dom with tab navigation in `apps/web/src/App.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 学習タブで札を閲覧して覚える (Priority: P1) 🎯 MVP

**Goal**: ゲストユーザーが札一覧を閲覧し、決まり字フィルタ・ひらがな切替・シャッフルを操作できる

**Independent Test**: http://localhost:5173 にアクセスし、12枚の札がグリッド表示され、ControlBarの全ボタンが動作することを確認

### Implementation for User Story 1

- [ ] T025 [P] [US1] Create poems.seed.json (Tokens/NoSpace付き、100首分) in `data/poems.seed.json`
- [ ] T026 [P] [US1] Copy poems.seed.json to frontend in `apps/web/src/data/poems.seed.json`
- [ ] T027 [US1] Create usePoems hook (札データ読み込み・フィルタ・シャッフル) in `apps/web/src/hooks/usePoems.ts`
- [ ] T028 [US1] Create karuta utility functions in `apps/web/src/utils/karuta.ts`
- [ ] T029 [US1] Implement HomePage (学習タブ) with CardGrid and ControlBar in `apps/web/src/pages/HomePage.tsx`
- [ ] T030 [US1] Implement ひらがな切替 (Tokens⇄KanaTokens) functionality in `apps/web/src/hooks/usePoems.ts`
- [ ] T031 [US1] Implement KimarijiSelector filter logic (kimarijiCount/kimariji selection, callback integration) in `apps/web/src/components/KimarijiSelector.tsx`
- [ ] T032 [US1] Implement シャッフル (条件維持で12枚再抽選) in `apps/web/src/hooks/usePoems.ts`
- [ ] T033 [US1] Add orientation-based grid CSS (4×3/3×4 auto-switch) in `apps/web/src/index.css`

**Checkpoint**: User Story 1 complete - ゲストユーザーが学習タブを利用可能

---

## Phase 4: User Story 5 - シーズンにエントリーする (Priority: P5, but dependency for US3)

**Goal**: ログインユーザーがシーズンにエントリーできる（競技機能の前提条件）

**Independent Test**: ログイン後、エントリー画面で部門選択→同意→エントリー完了のフローを確認

**Note**: US3（競技）の前提条件のため、US2より先に実装

### Implementation for User Story 5

- [ ] T034 [P] [US5] Create Entry type definitions in `apps/web/src/types/entry.ts`
- [ ] T035 [P] [US5] Create Season type definitions in `apps/web/src/types/season.ts`
- [ ] T036 [US5] Create Firestore service for entries/seasons in `apps/web/src/services/firestore.ts`
- [ ] T037 [US5] Implement EntryPage (エントリー画面) with division selection and consent in `apps/web/src/pages/EntryPage.tsx`
- [ ] T038 [US5] Implement entry validation (段位の部 requires 六級, single division per season) in `apps/web/src/services/firestore.ts`
- [ ] T039 [US5] Create ProfilePage for nickname and consent management in `apps/web/src/pages/ProfilePage.tsx`

**Checkpoint**: User Story 5 complete - ユーザーがシーズンにエントリー可能

---

## Phase 5: User Story 2 - 研鑽タブでクイズ形式の練習をする (Priority: P2)

**Goal**: ログインユーザーが決まり字数を選択してクイズ練習、成績を個人統計として記録

**Independent Test**: ログイン後、研鑽タブで決まり字数を選択→クイズ開始→回答→正解/不正解判定→結果サマリー表示を確認

### Implementation for User Story 2

- [ ] T040 [P] [US2] Create UserStats type definitions in `apps/web/src/types/userStats.ts`
- [ ] T041 [US2] Create usePractice hook (クイズロジック・タイミング計測) in `apps/web/src/hooks/usePractice.ts`
- [ ] T042 [US2] Implement KensanPage (研鑽タブ) with quiz UI in `apps/web/src/pages/KensanPage.tsx`
- [ ] T043 [US2] Implement quiz result summary display in `apps/web/src/pages/KensanPage.tsx`
- [ ] T044 [US2] Implement userStats save to Firestore in `apps/web/src/services/firestore.ts`
- [ ] T045 [US2] Create choice generation logic (4/8/16 choices, 段階0は4固定) in `apps/web/src/hooks/usePractice.ts`

**Checkpoint**: User Story 2 complete - ユーザーが研鑽タブでクイズ練習可能

---

## Phase 6: User Story 3 - 競技タブで公式競技セッションを実施する (Priority: P3)

**Goal**: エントリー済みユーザーが50問の公式競技を実施し、サーバー確定で番付に反映

**Independent Test**: エントリー済みユーザーとして公式競技を開始→50問回答→提出→サーバー確定（confirmed/invalid）を確認

### Implementation for User Story 3

- [ ] T046 [P] [US3] Create Session and Round type definitions in `functions/src/types/session.ts`
- [ ] T047 [US3] Create useOfficialSession hook (セッション管理・round保存) in `apps/web/src/hooks/useOfficialSession.ts`
- [ ] T048 [US3] Implement KyogiPage (競技タブ) with session flow UI in `apps/web/src/pages/KyogiPage.tsx`
- [ ] T049 [US3] Implement sessions/{id} and rounds/{roundIndex} Firestore operations in `apps/web/src/services/firestore.ts`
- [ ] T050 [US3] Implement official session lock (ひらがな/決まり字/覚えた/シャッフル disabled) in `apps/web/src/pages/KyogiPage.tsx`
- [ ] T051 [US3] Implement session expiration logic (60分タイムアウト) in `apps/web/src/hooks/useOfficialSession.ts`

### Callable Function (サーバー確定処理)

- [ ] T052 [US3] Create sessionValidator (異常検知ルール ROUNDS_MISMATCH, CHOICE_INTEGRITY, EXTREME_TIMING) in `functions/src/validators/sessionValidator.ts`
- [ ] T053 [US3] Create scoring utility (base + speedBonus calculation) in `functions/src/utils/scoring.ts`
- [ ] T054 [US3] Implement submitOfficialSession Callable Function in `functions/src/submitOfficialSession.ts`
- [ ] T055 [US3] Connect Callable Function to client submit flow in `apps/web/src/hooks/useOfficialSession.ts`
- [ ] T056 [US3] Implement invalid session display (「番付反映なし（参考記録）」) in `apps/web/src/pages/KyogiPage.tsx`

**Checkpoint**: User Story 3 complete - 公式競技セッションの実施から確定まで動作

---

## Phase 7: User Story 4 - 成績タブで個人成績と番付を閲覧する (Priority: P4)

**Goal**: ログインユーザーが個人成績と公式番付（殿堂・現シーズン）を閲覧できる

**Independent Test**: ログイン後、成績タブで個人成績（正解率・平均・決まり字別）と番付（殿堂・現シーズン上位100名）の表示を確認

### Implementation for User Story 4

- [ ] T057 [US4] Implement SeisekiPage (成績タブ) with personal stats section in `apps/web/src/pages/SeisekiPage.tsx`
- [ ] T058 [US4] Implement personal stats display (正解率/平均/分散/決まり字別) in `apps/web/src/pages/SeisekiPage.tsx`
- [ ] T059 [US4] Implement hall of fame display (過去全シーズン上位3名) in `apps/web/src/pages/SeisekiPage.tsx`
- [ ] T060 [US4] Implement current season banzuke display (上位100名、division一致のみ) in `apps/web/src/pages/SeisekiPage.tsx`
- [ ] T061 [US4] Create rankings cache read service in `apps/web/src/services/firestore.ts`

**Checkpoint**: User Story 4 complete - 成績タブで個人成績と番付を閲覧可能

---

## Phase 8: Scheduled Functions & Security

**Purpose**: 番付キャッシュ更新、Security Rules、コストガード

### Scheduled Function

- [ ] T062 Implement updateRankingsCache Scheduled Function (3時間ごと) in `functions/src/updateRankingsCache.ts`
- [ ] T063 Implement hallOfFame cache update logic in `functions/src/updateRankingsCache.ts`
- [ ] T064 Register scheduled function in `functions/src/index.ts`

### Security Rules

- [ ] T065 Create Firestore Security Rules (sessions/rounds本人のみ書込、rankings/hallOfFame公開読取) in `firestore.rules`
- [ ] T066 Validate Security Rules against quickstart.md test scenarios

### Cost Guard

- [ ] T067 Implement pagination and limits for rankings display (上位100名) in `apps/web/src/services/firestore.ts`
- [ ] T068 Ensure cache-first strategy (クライアントは都度集計せずキャッシュ参照) throughout the application

**Checkpoint**: Backend infrastructure complete - 番付キャッシュ自動更新とセキュリティ確保

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

## Phase 9: 覚えた機能 (learned)

**Purpose**: 覚えたボタンの永続化（ログイン時のみ）

- [ ] T069 [US1] Implement userLearned Firestore operations (覚えた保存/読込) in `apps/web/src/services/firestore.ts`
- [ ] T070 [US1] Connect 覚えた button to userLearned save (ログイン時) in `apps/web/src/pages/HomePage.tsx`
- [ ] T071 [US1] Implement learned filter (除外/優先表示) in `apps/web/src/hooks/usePoems.ts`

**Checkpoint**: 覚えた機能の永続化完了

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 品質向上と最終確認

- [ ] T072 Run quickstart.md validation scenarios (4シナリオすべて)
- [ ] T073 [P] Performance optimization (札一覧表示 < 3秒, クイズ判定 < 100ms)
- [ ] T074 [P] Responsive design validation in `apps/web/src/index.css`:
  - FR-008: タッチターゲット最小44px確保
  - FR-009: PC表示max-width 1200px
  - FR-010: 札テキストはTokensごとに折り返し（PoemCard.tsx）
- [ ] T075 [P] Error handling and user feedback improvements
- [ ] T076 Firebase deploy configuration (Hosting, Functions, Firestore Rules/Indexes)
- [ ] T077 Final integration test with Emulator Suite

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

| Phase | Description | Task Count |
|-------|-------------|------------|
| Phase 1 | Setup | 6 |
| Phase 2 | Foundational | 18 |
| Phase 3 | US1 学習 | 9 |
| Phase 4 | US5 エントリー | 6 |
| Phase 5 | US2 研鑽 | 6 |
| Phase 6 | US3 競技 | 11 |
| Phase 7 | US4 成績 | 5 |
| Phase 8 | Scheduled/Security | 7 |
| Phase 9 | 覚えた機能 | 3 |
| Phase 10 | Polish | 6 |
| **Total** | | **77** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Cost guard: 月1万円上限を遵守（キャッシュ参照徹底）
- Performance targets: 札一覧 < 3秒, クイズ判定 < 100ms, セッション確定 < 10秒, 番付表示 < 2秒
