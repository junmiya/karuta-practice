# Tasks: 歌合・節気別歌位確定システム

**Input**: Design documents from `/specs/102-utaawase-sekki-ranking/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/callable-functions.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions, shared utilities, and project scaffolding

- [x] T001 Create backend type definitions (Ruleset, SeasonCalendar, Event, UserProgress, SeasonSnapshot, JobRun, all level types and ordered arrays) in `functions/src/types/utaawase.ts`
- [x] T002 [P] Create frontend type mirror (without firebase-admin dependency, with display label maps) in `apps/web/src/types/utaawase.ts`
- [x] T003 [P] Create pure-function rule engine (determineSeason, determineTier, validateSeasonCalendar, validateRuleset, isSeasonFrozen) in `functions/src/lib/ruleEngine.ts`

**Note**: 級位は6段階 (beginner→十級→九級→八級→七級→六級)。五級(gokkyu)は存在しない。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Firestore services and security rules that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement rulesetService (getRuleset, saveRuleset with validation) in `functions/src/services/rulesetService.ts`
- [x] T005 [P] Implement seasonCalendarService (getSeasonCalendar, saveSeasonCalendar, getCurrentSeasonInfo, generate2026DefaultCalendar) in `functions/src/services/seasonCalendarService.ts`
- [x] T006 [P] Implement userProgressService (getUserProgress with auto-create, updateKyuiLevel, updateCumulativeScore with best-3 tracking, updateDanLevel, updateDenLevel, updateUtakuraiLevel, incrementOfficialWinCount, incrementChampionCount) in `functions/src/services/userProgressService.ts`
- [x] T007 Add Firestore security rules for new collections (rulesets, season_calendars, events, user_progress, season_snapshots, job_runs) — client write禁止 in `firestore.rules`
- [x] T008 [P] Add composite indexes (events by uid+seasonKey, events by seasonKey+eventType, season_snapshots by status+publishedAt, job_runs by seasonKey+startedAt) in `firestore.indexes.json`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 3 - 節気カレンダーとルールセットの投入 (Priority: P1) 🎯 MVP

**Goal**: 運営がAdminPageから節気カレンダーとルールセットを投入・管理できる

**Independent Test**: AdminPage → 節気カレンダータブ → 2026年データ投入 → Firestore確認。ルールセットタブ → YAML投入 → 読み込み確認

### Implementation for User Story 3

- [x] T009 [P] [US3] Implement admin callable functions (adminGetRuleset, adminSaveRuleset, adminGetSeasonCalendar, adminSaveSeasonCalendar, adminSeedDefaultCalendar) in `functions/src/adminFunctionsV2.ts`
- [x] T010 [P] [US3] Create frontend admin V2 service (callable wrappers for all admin functions) in `apps/web/src/services/admin-v2.service.ts`
- [x] T011 [US3] Add 節気カレンダー管理タブ and ルールセット管理タブ to `apps/web/src/pages/AdminPage.tsx`
- [x] T012 [US3] Export new admin functions from `functions/src/index.ts`

**Checkpoint**: AdminPageからカレンダー・ルールセットの投入・閲覧が可能

---

## Phase 4: User Story 2 - 歌合イベント記録と四季区分割当 (Priority: P1)

**Goal**: 公式競技セッション確定時にmatchイベントが自動生成され、seasonId/tier が正しく割り当てられる。スコアはベスト3回合計で集計。

**Independent Test**: OfficialPageで競技完了 → Firestore `events` コレクションにmatchドキュメント生成確認。seasonIdとtierが正しいことを確認

### Implementation for User Story 2

- [x] T013 [P] [US2] Implement eventService (createMatchEvent with season/tier auto-assignment, createKyuiExamEvent, getSeasonEvents, getUserSeasonEvents) in `functions/src/services/eventService.ts`
- [x] T014 [US2] Add V2 dual-write to submitOfficialSession: session確定後にmatchイベント自動生成 + user_progressベスト3累積スコア更新 in `functions/src/submitOfficialSession.ts`
- [x] T015 [US2] Export eventService functions from `functions/src/index.ts`

**Checkpoint**: 公式競技セッション確定→matchイベント自動生成→ベスト3スコア集計が動作

---

## Phase 5: User Story 1 - 級位検定（即時昇級） (Priority: P1)

**Goal**: プレイヤーが級位検定を受験し、合格条件を満たすと即座に昇級する

**Independent Test**: KyuiExamPageから検定実施 → 合格時に即座にuser_progressが更新されることを確認

### Implementation for User Story 1

- [x] T016 [P] [US1] Add evaluateKyuiPromotion (飛び級禁止、1段階のみ昇級、六級でdanEligible) to `functions/src/lib/ruleEngine.ts`
- [x] T017 [US1] Implement submitKyuiExam callable (検定結果受信→昇級判定→user_progress更新→イベント記録) in `functions/src/kyuiExamFunction.ts`
- [x] T018 [P] [US1] Create kyuiExam frontend service (submitKyuiExam callable wrapper) in `apps/web/src/services/kyuiExam.service.ts`
- [x] T019 [P] [US1] Create useKyuiExam hook (exam session phases: setup→inProgress→submitting→result) in `apps/web/src/hooks/useKyuiExam.ts`
- [x] T020 [US1] Create KyuiExamPage (setup: card filter selection, in-progress: quiz UI, result: pass/fail with promotion info) in `apps/web/src/pages/KyuiExamPage.tsx`
- [x] T021 [US1] Add `/kyui-exam` route in `apps/web/src/App.tsx`
- [x] T022 [US1] Export submitKyuiExam from `functions/src/index.ts`

**Checkpoint**: 検定ページから受験→即時昇級→結果表示が動作

---

## Phase 6: User Story 4 - 季末確定パイプライン (Priority: P2)

**Goal**: freeze→finalize→publishの3段階パイプラインを管理画面から実行可能にする

**Independent Test**: AdminPage → パイプラインタブ → freeze/finalize/publish → season_snapshot生成確認

### Implementation for User Story 4

- [x] T023 [P] [US4] Implement pipelineService (freezeSeason, finalizeSeason, publishSeason — 状態機械ベースの冪等パイプライン with JobRun logging, ベスト3ランキング生成) in `functions/src/services/pipelineService.ts`
- [x] T024 [P] [US4] Implement scheduledFunctionsV2 (checkSeasonBoundary: 毎日00:01 JST、節気境界チェック→自動freeze) in `functions/src/scheduledFunctionsV2.ts`
- [x] T025 [US4] Add admin pipeline callable functions (adminFreezeSeason, adminFinalizeSeason, adminPublishSeason, adminGetJobRuns) to `functions/src/adminFunctionsV2.ts`
- [x] T026 [US4] Add 確定パイプラインタブ to AdminPage (seasonKey input, freeze/finalize/publish buttons, job logs) in `apps/web/src/pages/AdminPage.tsx`
- [x] T027 [US4] Export pipeline functions and scheduled function from `functions/src/index.ts`

**Checkpoint**: パイプライン各段階が管理画面から実行可能、スナップショット生成確認

---

## Phase 7: User Story 5 - 段位・伝位・歌位の昇格判定 (Priority: P2)

**Goal**: finalize時に公式記録のみを対象として段位/伝位/歌位の昇格判定を実行

**Independent Test**: テストデータでfinalize実行→正しい昇格判定→user_progress更新確認

### Implementation for User Story 5

- [x] T028 [P] [US5] Add evaluateDanPromotion, evaluateDenPromotion, evaluateUtakuraiPromotion to `functions/src/lib/ruleEngine.ts`
- [x] T029 [US5] Implement promotionService (runPromotions: dan/den/utakurai判定, 上位1/3=公式勝利, rank 1=champion) in `functions/src/services/promotionService.ts`
- [x] T030 [US5] Integrate promotionService into pipelineService.finalizeSeason (finalize時にrunPromotions呼び出し) in `functions/src/services/pipelineService.ts`

**Checkpoint**: finalize実行→段位/伝位/歌位の昇格判定が正しく動作

---

## Phase 8: User Story 6 - 確定結果の参照表示 (Priority: P3)

**Goal**: publish済みスナップショットの閲覧と歌位一覧の表示

**Independent Test**: BanzukePage → 歌位タブ → publish済みスナップショットの昇格結果・ランキング表示確認

### Implementation for User Story 6

- [x] T031 [P] [US6] Create utaawase frontend service (getPublishedSnapshot, getLatestPublishedSnapshot, getUserProgress, getCurrentSeasonSnapshot) in `apps/web/src/services/utaawase.service.ts`
- [x] T032 [US6] Add 歌位(V2)ビューモード to BanzukePage (season_snapshots参照、ランキング・昇格結果表示) in `apps/web/src/pages/BanzukePage.tsx`

**Checkpoint**: publish済みスナップショットの閲覧が可能

---

## Phase 9: User Story 7 - 確定ジョブの監視と再実行 (Priority: P3)

**Goal**: 運営がジョブ実行ログを確認し、失敗ジョブを再実行できる

**Independent Test**: パイプライン実行後 → AdminPage → ジョブログ表示確認 → 失敗時の再実行確認

### Implementation for User Story 7

- [x] T033 [US7] Add adminGetJobRuns callable and retry functionality to `functions/src/adminFunctionsV2.ts`
- [x] T034 [US7] Add ジョブログ表示 and 再実行ボタン to AdminPage パイプラインタブ in `apps/web/src/pages/AdminPage.tsx`

**Checkpoint**: ジョブログの確認・再実行が管理画面から可能

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: コード品質・ビルド確認・セキュリティ最終確認

- [x] T035 Remove gokkyu (五級) from backend types KYUI_LEVELS_ORDERED in `functions/src/types/utaawase.ts` and frontend mirror in `apps/web/src/types/utaawase.ts`
- [x] T036 [P] Verify best-3 score logic in userProgressService.updateCumulativeScore stores individual scores array and computes bestThreeTotal in `functions/src/services/userProgressService.ts`
- [x] T037 [P] Verify pipelineService.freezeSeason builds rankings from bestThreeTotal (not cumulative sum) in `functions/src/services/pipelineService.ts`
- [x] T038 Run `cd functions && npx tsc --noEmit` to confirm backend builds clean
- [x] T039 Run `cd apps/web && npx tsc --noEmit` to confirm frontend builds clean
- [x] T040 Run quickstart.md validation (seed 2026 calendar, submit exam, run pipeline)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US3 (Phase 3)**: Depends on Phase 2 — Admin data entry (enables all other stories)
- **US2 (Phase 4)**: Depends on Phase 2 + US3 (needs calendar data)
- **US1 (Phase 5)**: Depends on Phase 2 (needs ruleEngine + userProgressService)
- **US4 (Phase 6)**: Depends on Phase 2 + US2 (needs events data)
- **US5 (Phase 7)**: Depends on US4 (integrated into finalize step)
- **US6 (Phase 8)**: Depends on US4 (needs published snapshots)
- **US7 (Phase 9)**: Depends on US4 (needs job_runs data)
- **Polish (Phase 10)**: Depends on all phases

### User Story Dependencies

- **US3 (P1)**: Foundation only — first to implement
- **US1 (P1)**: Foundation only — can run parallel with US3
- **US2 (P1)**: Foundation + US3 (needs season calendar)
- **US4 (P2)**: Foundation + US2
- **US5 (P2)**: US4 (finalize integration)
- **US6 (P3)**: US4 (needs published snapshots)
- **US7 (P3)**: US4 (needs job_runs)

### Parallel Opportunities

- T001, T002, T003 can run in parallel (Phase 1)
- T004, T005, T006, T008 can run in parallel (Phase 2)
- T009, T010 can run in parallel (US3)
- T013 can run parallel with US3 tasks (US2)
- T016, T018, T019 can run in parallel (US1)
- T023, T024 can run in parallel (US4)
- US1 and US3 can run in parallel after Foundation
- US6 and US7 can run in parallel after US4

---

## Implementation Strategy

### MVP First (US3 + US1)

1. Complete Phase 1: Setup (types + ruleEngine)
2. Complete Phase 2: Foundational (services + security rules)
3. Complete Phase 3: US3 (admin data entry)
4. Complete Phase 5: US1 (級位検定)
5. **STOP and VALIDATE**: 検定が動作し、即時昇級が反映されることを確認

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US3 → Admin data entry → Deploy (MVP-0)
3. US1 → 級位検定 → Deploy (MVP-1)
4. US2 → matchイベント自動生成 → Deploy
5. US4 + US5 → 季末パイプライン + 昇格判定 → Deploy
6. US6 + US7 → 表示 + 監視 → Deploy (Complete)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- ベスト3回合計方式: user_progress.seasons[key].scores に個別スコア保存、bestThreeTotal で上位3回合計
- 級位は6段階 (beginner→十級→九級→八級→七級→六級)、五級は存在しない
- 伝位の「上位入賞」= シーズンランキング上位1/3以内
- 各級位の最低出題数: 十級=7、九級=10、八級=15、七級=25、六級=50
