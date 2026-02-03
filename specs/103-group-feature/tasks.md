# Tasks: 団体機能（団体戦＋団体内イベント）

**Input**: Design documents from `/specs/103-group-feature/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested - implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/src/`
- **Backend Functions**: `functions/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install qrcode.react dependency in apps/web/package.json
- [x] T002 [P] Create group type definitions in apps/web/src/types/group.ts
- [x] T003 [P] Create group type definitions in functions/src/types/group.ts
- [x] T004 [P] Create invite code crypto utility in functions/src/lib/crypto.ts
- [x] T005 Update Firestore indexes in firestore.indexes.json for group collections
- [x] T006 Update Security Rules in firestore.rules for group collections

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Create group service foundation in functions/src/services/groupService.ts (permission check helpers)
- [x] T008 [P] Create invite service foundation in functions/src/services/inviteService.ts (code generation/verification)
- [x] T009 [P] Create audit log helper for group operations in functions/src/services/groupAuditService.ts
- [x] T010 [P] Create group.service.ts frontend service wrapper in apps/web/src/services/group.service.ts
- [x] T011 [P] Create useGroup hook foundation in apps/web/src/hooks/useGroup.ts
- [x] T012 [P] Create useGroupMembership hook in apps/web/src/hooks/useGroupMembership.ts
- [x] T013 Add group routes to apps/web/src/App.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 団体を作成する (Priority: P1) 🎯 MVP

**Goal**: ユーザーが団体を作成し、招待コードを発行してQR表示できる

**Independent Test**: 団体作成→招待コード発行→QR表示まで単独でテスト可能。作成者が団体管理者として設定されることを確認。

### Implementation for User Story 1

- [x] T014 [US1] Implement createGroup callable function in functions/src/groupFunctions.ts
- [x] T015 [US1] Implement getGroup callable function in functions/src/groupFunctions.ts
- [x] T016 [US1] Implement getMyGroups callable function in functions/src/groupFunctions.ts
- [x] T017 [US1] Implement regenerateInviteCode callable function in functions/src/groupFunctions.ts
- [x] T018 [US1] Implement revokeInviteCode callable function in functions/src/groupFunctions.ts
- [x] T019 [US1] Implement getInviteCode callable function in functions/src/groupFunctions.ts
- [x] T020 [P] [US1] Create GroupCard component in apps/web/src/components/group/GroupCard.tsx
- [x] T021 [P] [US1] Create InviteCodeDisplay component in apps/web/src/components/group/InviteCodeDisplay.tsx
- [x] T022 [P] [US1] Create QRCodeModal component in apps/web/src/components/group/QRCodeModal.tsx
- [x] T023 [US1] Create GroupCreatePage in apps/web/src/pages/GroupCreatePage.tsx
- [x] T024 [US1] Create GroupHomePage in apps/web/src/pages/GroupHomePage.tsx (団体トップ with 招待コード管理)
- [x] T025 [US1] Create GroupListPage in apps/web/src/pages/GroupListPage.tsx
- [x] T026 [US1] Add group section to ProfilePage in apps/web/src/pages/ProfilePage.tsx
- [x] T027 [US1] Export group functions in functions/src/index.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 招待コードで団体に参加する (Priority: P1)

**Goal**: ユーザーが招待コードまたはQRコードで団体に参加できる

**Independent Test**: 招待コード入力→参加完了まで単独でテスト可能。QR読み取りからの参加も同一ロジックで検証。

### Implementation for User Story 2

- [x] T028 [US2] Implement joinGroup callable function in functions/src/groupFunctions.ts (with invite validation)
- [x] T029 [US2] Implement getInviteInfo callable function in functions/src/groupFunctions.ts
- [ ] T030 [P] [US2] Create InviteCodeInput component in apps/web/src/components/group/InviteCodeInput.tsx
- [x] T031 [US2] Create GroupJoinPage in apps/web/src/pages/GroupJoinPage.tsx
- [x] T032 [US2] Handle deep link /join route with groupId and code params in apps/web/src/App.tsx
- [x] T033 [US2] Add login redirect flow for unauthenticated users on /join in apps/web/src/pages/GroupJoinPage.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 団体内イベントを開催する (Priority: P2)

**Goal**: 団体管理者/運営がイベントを作成・公開し、メンバーが参加できる

**Independent Test**: イベント作成→公開→メンバー参加まで単独でテスト可能。

### Implementation for User Story 3

- [x] T034 [US3] Implement createEvent callable function in functions/src/groupFunctions.ts
- [x] T035 [US3] Implement updateEvent callable function in functions/src/groupFunctions.ts
- [x] T036 [US3] Implement publishEvent callable function in functions/src/groupFunctions.ts
- [x] T037 [US3] Implement closeEvent callable function in functions/src/groupFunctions.ts
- [x] T038 [US3] Implement getGroupEvents callable function in functions/src/groupFunctions.ts
- [x] T039 [US3] Implement joinEvent callable function in functions/src/groupFunctions.ts
- [x] T040 [US3] Implement leaveEvent callable function in functions/src/groupFunctions.ts
- [x] T041 [US3] Implement getEventParticipants callable function in functions/src/groupFunctions.ts
- [ ] T042 [P] [US3] Create EventCard component in apps/web/src/components/group/EventCard.tsx
- [ ] T043 [P] [US3] Create EventList component in apps/web/src/components/group/EventList.tsx
- [ ] T044 [P] [US3] Create EventForm component in apps/web/src/components/group/EventForm.tsx
- [x] T045 [US3] Create GroupEventPage in apps/web/src/pages/GroupEventPage.tsx (イベント一覧/作成/編集)
- [x] T046 [US3] Add イベント entry point to GroupHomePage in apps/web/src/pages/GroupHomePage.tsx

**Checkpoint**: User Stories 1, 2, 3 should all work independently

---

## Phase 6: User Story 4 - 団体戦に参加する (Priority: P2)

**Goal**: 団体メンバーが団体を代表して競技に参加し、成績が団体に紐づけられる

**Independent Test**: 競技開始時に団体紐づけ→成績記録→団体集計反映まで単独でテスト可能。

### Implementation for User Story 4

- [x] T047 [US4] Extend submitOfficialSession to include affiliatedGroupId in functions/src/submitOfficialSession.ts
- [x] T048 [US4] Update Session type to include affiliatedGroupId/affiliatedGroupName in functions/src/types/session.ts
- [x] T049 [US4] Create groupStatsService for aggregation in functions/src/services/groupStatsService.ts
- [x] T050 [US4] Create scheduled function for group stats aggregation in functions/src/scheduledFunctionsV2.ts
- [x] T051 [US4] Update Session type in frontend in apps/web/src/types/session.ts
- [x] T052 [P] [US4] Create GroupSelector component for match start in apps/web/src/components/group/GroupSelector.tsx
- [ ] T053 [US4] Create GroupMatchPage in apps/web/src/pages/GroupMatchPage.tsx (団体戦エントリー)
- [x] T054 [US4] Add 団体戦 entry point to GroupHomePage in apps/web/src/pages/GroupHomePage.tsx
- [x] T055 [US4] Integrate group selection into existing match flow in apps/web/src/pages/OfficialPage.tsx

**Checkpoint**: User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - 団体メンバーのロールを管理する (Priority: P2)

**Goal**: 団体管理者がメンバーのロールを変更、除名できる

**Independent Test**: ロール変更→権限反映確認まで単独でテスト可能。

### Implementation for User Story 5

- [x] T056 [US5] Implement getGroupMembers callable function in functions/src/groupFunctions.ts
- [x] T057 [US5] Implement changeRole callable function in functions/src/groupFunctions.ts
- [x] T058 [US5] Implement removeMember callable function in functions/src/groupFunctions.ts
- [x] T059 [US5] Implement leaveGroup callable function in functions/src/groupFunctions.ts
- [ ] T060 [P] [US5] Create MemberList component in apps/web/src/components/group/MemberList.tsx
- [ ] T061 [P] [US5] Create MemberRoleDialog component in apps/web/src/components/group/MemberRoleDialog.tsx
- [x] T062 [US5] Create GroupMembersPage in apps/web/src/pages/GroupMembersPage.tsx
- [x] T063 [US5] Add member management link to GroupHomePage in apps/web/src/pages/GroupHomePage.tsx

**Checkpoint**: User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - プラットフォーム管理者が介入する (Priority: P3)

**Goal**: 運営管理者が団体やユーザーに対して措置を取れる

**Independent Test**: 団体停止/ユーザーBAN→アクセス制限確認まで単独でテスト可能。

### Implementation for User Story 6

- [x] T064 [US6] Implement adminSuspendGroup callable function in functions/src/adminFunctionsV2.ts
- [x] T065 [US6] Implement adminResumeGroup callable function in functions/src/adminFunctionsV2.ts
- [x] T066 [US6] Implement adminDeleteGroup callable function in functions/src/adminFunctionsV2.ts
- [x] T067 [US6] Implement adminGetGroupAuditLogs callable function in functions/src/adminFunctionsV2.ts
- [x] T068 [US6] Add group admin functions to existing admin UI (if exists) or create AdminGroupPage in apps/web/src/pages/AdminGroupPage.tsx
- [x] T069 [US6] Export admin group functions in functions/src/index.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T070 [P] Add loading states and error handling to all group pages
- [x] T071 [P] Add validation messages for group name/description in GroupCreatePage
- [x] T072 [P] Add confirmation dialogs for destructive actions (leave, remove, delete)
- [x] T073 Code review for security (no invite code plaintext leaks)
- [ ] T074 Verify all audit logs are being written correctly
- [ ] T075 Run quickstart.md validation and update if needed
- [ ] T076 Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] T077 Deploy Security Rules: `firebase deploy --only firestore:rules`
- [ ] T078 Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] T079 Deploy Frontend: `cd apps/web && npm run build && firebase deploy --only hosting`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 - should be done first
  - US3, US4, US5 are P2 - can be parallelized
  - US6 is P3 - can be deferred
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Uses invite service from US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational - Requires group to exist (integrates with US1)
- **User Story 4 (P2)**: Can start after Foundational - Requires membership (integrates with US1/2)
- **User Story 5 (P2)**: Can start after Foundational - Requires members to manage (integrates with US2)
- **User Story 6 (P3)**: Can start after Foundational - Admin functions are independent

### Within Each User Story

- Models/types before services
- Backend functions before frontend pages
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can run in parallel (different files)
- T007, T008, T009, T010, T011, T012 can run in parallel (different services)
- T020, T021, T022 can run in parallel (different components)
- T042, T043, T044 can run in parallel (different components)
- T060, T061 can run in parallel (different components)
- Once Foundational phase completes, US1 and US2 can start in parallel

---

## Parallel Example: User Story 1 Components

```bash
# Launch all components for User Story 1 together:
Task: "Create GroupCard component in apps/web/src/components/group/GroupCard.tsx"
Task: "Create InviteCodeDisplay component in apps/web/src/components/group/InviteCodeDisplay.tsx"
Task: "Create QRCodeModal component in apps/web/src/components/group/QRCodeModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (団体作成)
4. Complete Phase 4: User Story 2 (団体参加)
5. **STOP and VALIDATE**: Test group creation and joining independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (イベント) → Test independently → Deploy/Demo
4. Add User Story 4 (団体戦) → Test independently → Deploy/Demo
5. Add User Story 5 (ロール管理) → Test independently → Deploy/Demo
6. Add User Story 6 (管理者) → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (団体作成)
   - Developer B: User Story 2 (団体参加)
3. After US1+2:
   - Developer A: User Story 3 (イベント)
   - Developer B: User Story 4 (団体戦)
   - Developer C: User Story 5 (ロール管理)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Security: Never log or expose invite code plaintext except in API response
- Constitution: Group features are in profile tab subsection, not main tabs
