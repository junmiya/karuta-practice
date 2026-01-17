# Tasks: 段階0 12枚固定練習UI・公式競技・番付

**Input**: Design documents from `/specs/004-stage0-12card-practice/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/src/`
- **Cloud Functions**: `functions/src/`
- Paths follow plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Cloud Functions setup

- [ ] T001 Initialize Cloud Functions project in functions/ directory with TypeScript
- [ ] T002 [P] Configure Firebase Functions dependencies in functions/package.json
- [ ] T003 [P] Create functions/src/index.ts entry point with Firebase Admin initialization
- [ ] T004 Update apps/web/src/lib/firebase.ts to include Functions instance

**Checkpoint**: Cloud Functions project ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [P] Create Poem type definition in apps/web/src/types/poem.ts (with Tokens/NoSpace fields)
- [ ] T006 [P] Create Session type definition in apps/web/src/types/session.ts
- [ ] T007 [P] Create Entry type definition in apps/web/src/types/entry.ts
- [ ] T008 [P] Create Ranking type definition in apps/web/src/types/ranking.ts
- [ ] T009 Update poems.service.ts to use new Poem type with Tokens in apps/web/src/services/poems.service.ts
- [ ] T010 Update poems.json with Tokens and NoSpace fields per data-model.md in apps/web/src/data/poems.json
- [ ] T011 Create Firestore Security Rules in firestore.rules for sessions, entries, rankings, userStats
- [ ] T012 Deploy Firestore Security Rules via firebase deploy --only firestore:rules

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 12枚固定の基本練習 (Priority: P1) 🎯 MVP

**Goal**: ログイン不要で12枚の取札を4×3グリッドで表示し、練習できる

**Independent Test**: トップページから練習を開始し、12枚の札から正解を選んで次の問題に進めることを確認する

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create KarutaCard component with 73:52 aspect ratio in apps/web/src/components/KarutaCard.tsx
- [ ] T014 [P] [US1] Create KarutaGrid component with 4x3 grid layout in apps/web/src/components/KarutaGrid.tsx
- [ ] T015 [US1] Create PracticeControls component (ひらがな, 決まり字, シャッフル) in apps/web/src/components/PracticeControls.tsx
- [ ] T016 [US1] Create usePractice hook for practice state management in apps/web/src/hooks/usePractice.ts
- [ ] T017 [US1] Implement 12-card selection logic in usePractice.ts (random selection with kimariji filter)
- [ ] T018 [US1] Update PracticePage to use KarutaGrid and PracticeControls in apps/web/src/pages/PracticePage.tsx
- [ ] T019 [US1] Add shuffle functionality maintaining current filter conditions in usePractice.ts
- [ ] T020 [US1] Add hiragana toggle functionality switching between yomi/yomiKana and tori/toriKana
- [ ] T021 [US1] Add kimariji filter UI allowing selection of 1-6 kimariji counts
- [ ] T022 [US1] Update CSS for karuta-card and karuta-grid classes in apps/web/src/index.css

**Checkpoint**: User Story 1 complete - 12-card practice UI fully functional

---

## Phase 4: User Story 2 - 公式競技への参加 (Priority: P2)

**Goal**: ログイン済みユーザーが50問の公式競技に参加し、結果がサーバーで確定される

**Independent Test**: ログインしてエントリー後、50問を完了し、結果が「確定済み」となることを確認する

### Implementation for User Story 2

#### Cloud Functions (Backend)

- [ ] T023 [P] [US2] Create scoreCalculator service in functions/src/services/scoreCalculator.ts
- [ ] T024 [P] [US2] Create sessionValidator with 5 anomaly detection rules in functions/src/validators/sessionValidator.ts
- [ ] T025 [P] [US2] Create rankingUpdater service with transaction in functions/src/services/rankingUpdater.ts
- [ ] T026 [US2] Implement submitOfficialSession Callable Function in functions/src/submitOfficialSession.ts
- [ ] T027 [US2] Export submitOfficialSession in functions/src/index.ts
- [ ] T028 [US2] Build and deploy Cloud Functions via npm run build && firebase deploy --only functions

#### Frontend (Entry & Session)

- [ ] T029 [P] [US2] Create entry.service.ts for entry management in apps/web/src/services/entry.service.ts
- [ ] T030 [P] [US2] Create session.service.ts for session management in apps/web/src/services/session.service.ts
- [ ] T031 [US2] Create useOfficialSession hook in apps/web/src/hooks/useOfficialSession.ts
- [ ] T032 [US2] Create EntryPage with division selection and consent in apps/web/src/pages/EntryPage.tsx
- [ ] T033 [US2] Create OfficialPage for 50-question session in apps/web/src/pages/OfficialPage.tsx
- [ ] T034 [US2] Implement round saving to Firestore subcollection in session.service.ts
- [ ] T035 [US2] Implement submit button calling submitOfficialSession Callable in OfficialPage.tsx
- [ ] T036 [US2] Display confirmed/invalid result after submission in OfficialPage.tsx
- [ ] T037 [US2] Add route for /entry and /official in apps/web/src/App.tsx

**Checkpoint**: User Story 2 complete - Official competition fully functional

---

## Phase 5: User Story 3 - 公式番付の閲覧 (Priority: P3)

**Goal**: シーズン×部門ごとのランキングを表示し、自分の順位を確認できる

**Independent Test**: 番付ページで級位の部・段位の部のランキングが表示され、自分の順位がハイライトされることを確認する

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create ranking.service.ts for fetching rankings in apps/web/src/services/ranking.service.ts
- [ ] T039 [P] [US3] Create useRanking hook in apps/web/src/hooks/useRanking.ts
- [ ] T040 [US3] Create RankingList component in apps/web/src/components/RankingList.tsx
- [ ] T041 [US3] Update BanzukePage to use RankingList with division tabs in apps/web/src/pages/BanzukePage.tsx
- [ ] T042 [US3] Add highlight for current user's rank in RankingList.tsx
- [ ] T043 [US3] Add division toggle (kyu/dan) in BanzukePage.tsx

**Checkpoint**: User Story 3 complete - Ranking display fully functional

---

## Phase 6: User Story 4 - 覚えた札の管理 (Priority: P4)

**Goal**: ログイン済みユーザーが札を「覚えた」としてマークし、練習から除外できる

**Independent Test**: 練習中に「覚えた」ボタンを押し、その札が覚えたリストに追加されることを確認する

### Implementation for User Story 4

- [ ] T044 [P] [US4] Create learned.service.ts for managing learned poems in apps/web/src/services/learned.service.ts
- [ ] T045 [P] [US4] Add LearnedButton component in apps/web/src/components/LearnedButton.tsx
- [ ] T046 [US4] Update usePractice hook to integrate learned filter in apps/web/src/hooks/usePractice.ts
- [ ] T047 [US4] Add learned poem storage to Firestore users/{uid}/learned subcollection
- [ ] T048 [US4] Add "exclude learned" option to PracticeControls in apps/web/src/components/PracticeControls.tsx

**Checkpoint**: User Story 4 complete - Learned card management functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, testing, and deployment

- [ ] T049 [P] Verify all routes work correctly in apps/web/src/App.tsx
- [ ] T050 [P] Add loading states and error handling across all pages
- [ ] T051 Create initial season document (2026_spring) in Firestore via Firebase Console
- [ ] T052 Build and deploy frontend via npm run build && firebase deploy --only hosting
- [ ] T053 Run quickstart.md validation steps to verify all functionality

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): No dependencies on other stories
  - US2 (P2): No dependencies on other stories (uses same KarutaGrid but different page)
  - US3 (P3): Depends on US2 (needs rankings to exist from confirmed sessions)
  - US4 (P4): Integrates with US1 (adds to practice flow)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Best tested after US2 creates rankings
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Integrates with US1 components

### Within Each User Story

- Types before services
- Services before hooks
- Hooks before pages/components
- Backend before frontend (for US2)
- Core implementation before integration

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational type definitions (T005-T008) can run in parallel
- All Cloud Functions services (T023-T025) can run in parallel
- Frontend entry/session services (T029-T030) can run in parallel
- US3 services (T038-T039) can run in parallel
- US4 services (T044-T045) can run in parallel

---

## Parallel Example: User Story 2 Cloud Functions

```bash
# Launch all services for US2 backend together:
Task: "Create scoreCalculator service in functions/src/services/scoreCalculator.ts"
Task: "Create sessionValidator with 5 anomaly detection rules in functions/src/validators/sessionValidator.ts"
Task: "Create rankingUpdater service with transaction in functions/src/services/rankingUpdater.ts"

# Then implement main function:
Task: "Implement submitOfficialSession Callable Function in functions/src/submitOfficialSession.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test 12-card practice independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → Test independently → Deploy (Official Competition!)
4. Add User Story 3 → Test independently → Deploy (Rankings!)
5. Add User Story 4 → Test independently → Deploy (Learned Cards!)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Frontend Practice UI)
   - Developer B: User Story 2 Backend (Cloud Functions)
   - Developer C: User Story 2 Frontend (Entry + Official Pages)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Cloud Functions require Blaze plan to be active for deployment
