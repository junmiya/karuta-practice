# Implementation Tasks: Phase 0 - Official Banzuke System

**Feature**: Phase 0 - Official Banzuke System
**Branch**: `003-official-banzuke`
**Date**: 2026-01-17
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Format

```
- [ ] [TaskID] [P] [Story] Description with file path
```

- **[P]**: Parallelizable (can run simultaneously with other [P] tasks in same phase)
- **[Story]**: User Story label (US1, US2, US3, US4)
- **TaskID**: Sequential task number (T001, T002, ...)

---

## Phase 1: Setup & Foundation

**Goal**: Initialize project structure, Firebase configuration, and seed data

**Independent Test**: Project builds successfully, Firebase initialized, poems loaded from Firestore

### Tasks

- [ ] T001 Create Vite + React + TypeScript project in apps/web directory
- [ ] T002 [P] Install dependencies: react-router-dom, firebase, tailwind CSS in apps/web/package.json
- [ ] T003 [P] Configure Tailwind CSS in apps/web/tailwind.config.js and apps/web/src/styles/index.css
- [ ] T004 [P] Configure Vite with alias (@/) in apps/web/vite.config.ts
- [ ] T005 Create .env.example template in apps/web/.env.example
- [ ] T006 Create .gitignore entries for .env and service-account-key.json
- [ ] T007 Initialize Firebase project with Firestore, Auth, Functions, Hosting in firebase/ directory
- [ ] T008 [P] Create Firebase initialization service in apps/web/src/services/firebase.ts
- [ ] T009 [P] Create TypeScript type definitions in apps/web/src/types/poem.ts
- [ ] T010 [P] Create TypeScript type definitions in apps/web/src/types/user.ts
- [ ] T011 [P] Create TypeScript type definitions in apps/web/src/types/submission.ts
- [ ] T012 [P] Create TypeScript type definitions in apps/web/src/types/practice.ts
- [ ] T013 Create poems.seed.json with 100 poems in scripts/poems.seed.json
- [ ] T014 Create seed script in scripts/seed-poems.ts with Admin SDK initialization
- [ ] T015 Add npm script "seed:poems" to root package.json
- [ ] T016 Run seed script and verify 100 poems in Firestore console
- [ ] T017 Create Firestore Security Rules in firebase/firestore.rules (poems read-only, users user-owned, submissions function-only)
- [ ] T018 Create Firestore indexes configuration in firebase/firestore.indexes.json
- [ ] T019 Deploy Firestore rules: firebase deploy --only firestore:rules
- [ ] T020 Create base App.tsx with React Router setup in apps/web/src/App.tsx
- [ ] T021 [P] Create Layout component in apps/web/src/components/Layout.tsx
- [ ] T022 [P] Create Header component in apps/web/src/components/Header.tsx

---

## Phase 2: User Story 1 - Practice Play (P1)

**Goal**: Implement 10-question practice session with 8-choice format and millisecond timing

**Independent Test**: Complete practice session, view results with correctCount, elapsedMs, avgMs (no auth required)

**Story Dependencies**: None (can be implemented independently)

### Tasks

- [ ] T023 [P] [US1] Create PrecisionTimer utility in apps/web/src/utils/timer.ts using performance.now()
- [ ] T024 [P] [US1] Create random poem selection utility in apps/web/src/utils/random.ts
- [ ] T025 [P] [US1] Create poems service in apps/web/src/services/poems.service.ts with getAllPoems() query
- [ ] T026 [P] [US1] Create practice session logic in apps/web/src/services/practice.service.ts (generate questions, validate answers)
- [ ] T027 [US1] Create usePracticeSession hook in apps/web/src/hooks/usePracticeSession.ts (state management for session)
- [ ] T028 [P] [US1] Create PracticeQuestion component in apps/web/src/components/PracticeQuestion.tsx (display yomi + 8 tori choices)
- [ ] T029 [US1] Create PracticePage component in apps/web/src/pages/PracticePage.tsx (orchestrate 10-question flow)
- [ ] T030 [US1] Add route /practice to apps/web/src/App.tsx
- [ ] T031 [US1] Create ResultPage component in apps/web/src/pages/ResultPage.tsx (display correctCount, elapsedMs, avgMs)
- [ ] T032 [US1] Add route /result to apps/web/src/App.tsx
- [ ] T033 [US1] Create HomePage component in apps/web/src/pages/HomePage.tsx with "練習開始" button
- [ ] T034 [US1] Add route / to apps/web/src/App.tsx
- [ ] T035 [US1] Test: Complete 10-question session and verify timing accuracy (< 5ms variance per question)
- [ ] T036 [US1] Test: Verify correct/incorrect answer feedback shows immediately on click
- [ ] T037 [US1] Test: Verify result summary displays correctCount (0-10), total elapsedMs, avgMs

---

## Phase 3: User Story 2 - Authentication & Profile (P2)

**Goal**: Implement Google/anonymous auth with nickname and banzukeConsent profile setup

**Independent Test**: Login, set nickname, verify user document created in Firestore users/{uid}

**Story Dependencies**: None (can be implemented independently of US1)

### Tasks

- [ ] T038 [P] [US2] Create auth service in apps/web/src/services/auth.service.ts (signInWithGoogle, signInAnonymous, signOut)
- [ ] T039 [P] [US2] Create users service in apps/web/src/services/users.service.ts (createUser, updateUser, getUserProfile)
- [ ] T040 [US2] Create useAuth hook in apps/web/src/hooks/useAuth.ts (manage auth state with onAuthStateChanged)
- [ ] T041 [US2] Create useUserProfile hook in apps/web/src/hooks/useUserProfile.ts (fetch and cache user profile)
- [ ] T042 [P] [US2] Create ProtectedRoute component in apps/web/src/components/ProtectedRoute.tsx (redirect if not authenticated)
- [ ] T043 [P] [US2] Create ProfileCompleteRoute component in apps/web/src/components/ProfileCompleteRoute.tsx (check nickname + banzukeConsent)
- [ ] T044 [US2] Create ProfileSetupPage component in apps/web/src/pages/ProfileSetupPage.tsx (nickname input + consent checkbox)
- [ ] T045 [US2] Add route /profile-setup to apps/web/src/App.tsx (protected route)
- [ ] T046 [US2] Update Header component to show login/logout button in apps/web/src/components/Header.tsx
- [ ] T047 [US2] Update ResultPage to check auth before showing "公式提出" button in apps/web/src/pages/ResultPage.tsx
- [ ] T048 [US2] Test: Login with Google authentication and verify redirect to profile setup
- [ ] T049 [US2] Test: Login anonymously and verify user document created in Firestore
- [ ] T050 [US2] Test: Set nickname and banzukeConsent, verify updatedAt timestamp updated
- [ ] T051 [US2] Test: Attempt official submission without nickname, verify blocked with prompt

---

## Phase 4: User Story 3 - Official Submission (P3)

**Goal**: Implement Cloud Functions Callable for server-side validation, score calculation, anomaly detection

**Independent Test**: Submit practice results, verify Cloud Function creates submission with correct score and official flag

**Story Dependencies**: Requires US1 (practice results) and US2 (authentication)

### Cloud Functions Setup

- [ ] T052 [P] [US3] Initialize Cloud Functions project in functions/ directory (TypeScript, Node.js 18)
- [ ] T053 [P] [US3] Install dependencies: firebase-admin, firebase-functions v2 in functions/package.json
- [ ] T054 [P] [US3] Configure tsconfig.json for Cloud Functions in functions/tsconfig.json
- [ ] T055 [P] [US3] Create Admin SDK initialization in functions/src/index.ts

### Server-Side Logic

- [ ] T056 [P] [US3] Create score calculator in functions/src/lib/scoreCalculator.ts (formula: max(0, correctCount * 100 + round(max(0, 300 - elapsedMs/1000))))
- [ ] T057 [P] [US3] Create anomaly detector in functions/src/lib/anomalyDetector.ts (3 rules: elapsedMs < 2000, correctCount range, questionCount != 10)
- [ ] T058 [P] [US3] Create JST date utility in functions/src/lib/jstDate.ts (getCurrentJstDate with UTC+9 offset)
- [ ] T059 [P] [US3] Create TypeScript types in functions/src/types/submission.ts (SubmitPayload, SubmitResponse)
- [ ] T060 [US3] Create submitOfficialRecord Callable function in functions/src/submitOfficialRecord.ts (payload validation, score calc, anomaly detection, Firestore write)
- [ ] T061 [US3] Export submitOfficialRecord from functions/src/index.ts

### Frontend Integration

- [ ] T062 [P] [US3] Create submission service in apps/web/src/services/submission.service.ts (call httpsCallable)
- [ ] T063 [US3] Update ResultPage to add "公式提出" button in apps/web/src/pages/ResultPage.tsx
- [ ] T064 [US3] Implement submission flow: click → call Cloud Function → display result in apps/web/src/pages/ResultPage.tsx
- [ ] T065 [US3] Handle submission errors (unauthenticated, invalid-argument, internal) in apps/web/src/pages/ResultPage.tsx
- [ ] T066 [US3] Display submission result: "公式記録" or "参考記録（番付反映なし）" with invalidReasons in apps/web/src/pages/ResultPage.tsx

### Deployment & Testing

- [ ] T067 [US3] Build Cloud Functions: npm run build in functions/
- [ ] T068 [US3] Deploy Cloud Functions: firebase deploy --only functions
- [ ] T069 [US3] Test: Submit valid session (10 correct, 20s), verify score = 1280, official=true
- [ ] T070 [US3] Test: Submit too-fast session (10 correct, 1.5s), verify official=false with invalidReasons
- [ ] T071 [US3] Test: Submit invalid correctCount (15), verify official=false
- [ ] T072 [US3] Test: Verify dayKeyJst calculated in JST (test at midnight boundary)
- [ ] T073 [US3] Test: Verify serverSubmittedAt is server timestamp (not client time)

---

## Phase 5: User Story 4 - Banzuke Display (P4)

**Goal**: Display today's official rankings sorted by score (desc) with tiebreaker serverSubmittedAt (asc)

**Independent Test**: Seed sample submissions, verify banzuke displays with correct sort order and columns

**Story Dependencies**: Requires US3 (submissions collection populated)

### Tasks

- [ ] T074 [P] [US4] Create banzuke service in apps/web/src/services/banzuke.service.ts (query submissions with composite filter/sort)
- [ ] T075 [P] [US4] Create JST date utility in apps/web/src/utils/jstDate.ts (getCurrentJstDate for client-side display)
- [ ] T076 [US4] Create useBanzuke hook in apps/web/src/hooks/useBanzuke.ts (fetch and cache today's rankings)
- [ ] T077 [US4] Create BanzukePage component in apps/web/src/pages/BanzukePage.tsx (display ranking table)
- [ ] T078 [US4] Add route /banzuke to apps/web/src/App.tsx
- [ ] T079 [US4] Update HomePage to add "番付（本日）" link in apps/web/src/pages/HomePage.tsx
- [ ] T080 [US4] Update ResultPage to add "番付を見る" link in apps/web/src/pages/ResultPage.tsx
- [ ] T081 [US4] Implement ranking columns: 順位, 表示名, スコア, 正答数, 平均時間(ms) in apps/web/src/pages/BanzukePage.tsx
- [ ] T082 [US4] Add page header "公式番付（本日）" with JST date in apps/web/src/pages/BanzukePage.tsx
- [ ] T083 [US4] Add disclaimer "公式記録のみ反映 / サーバ側で異常値判定済み" in apps/web/src/pages/BanzukePage.tsx
- [ ] T084 [US4] Handle empty state: "本日の公式記録はまだありません" in apps/web/src/pages/BanzukePage.tsx
- [ ] T085 [US4] Test: Create 3 submissions (scores: 1280, 1280, 1075), verify rank order (1, 2, 3) with tiebreaker
- [ ] T086 [US4] Test: Verify only official=true submissions appear (reference records excluded)
- [ ] T087 [US4] Test: Verify nickname lookup works (joins users/{uid})
- [ ] T088 [US4] Test: Verify query uses composite index (check Firestore console for auto-created index)

---

## Phase 6: Firestore Security Rules & Indexes

**Goal**: Enforce security constraints and create composite index for banzuke query

**Independent Test**: Attempt unauthorized writes, verify blocked by Security Rules

### Tasks

- [ ] T089 [P] Update Firestore Rules: poems read-only in firebase/firestore.rules
- [ ] T090 [P] Update Firestore Rules: users user-owned (create/update only own uid) in firebase/firestore.rules
- [ ] T091 [P] Update Firestore Rules: submissions function-only writes (all client writes denied) in firebase/firestore.rules
- [ ] T092 [P] Update Firestore Rules: submissions read-only for own uid in firebase/firestore.rules
- [ ] T093 Create composite index: (dayKeyJst ASC, official ASC, score DESC, serverSubmittedAt ASC) in firebase/firestore.indexes.json
- [ ] T094 Deploy Firestore rules: firebase deploy --only firestore:rules
- [ ] T095 Deploy Firestore indexes: firebase deploy --only firestore:indexes
- [ ] T096 Test: Attempt to write to poems collection from client, verify blocked
- [ ] T097 Test: Attempt to write to other user's document in users/{uid}, verify blocked
- [ ] T098 Test: Attempt to create submission from client, verify blocked
- [ ] T099 Test: Verify banzuke query uses composite index (no "index required" error)

---

## Phase 7: Polish & Deployment

**Goal**: Build for production, deploy to Firebase Hosting, end-to-end verification

**Independent Test**: Full user flow works on deployed site (practice → submit → banzuke)

### Tasks

- [ ] T100 [P] Add error boundaries in apps/web/src/components/ErrorBoundary.tsx
- [ ] T101 [P] Add loading states for async operations in apps/web/src/components/LoadingSpinner.tsx
- [ ] T102 [P] Add responsive design breakpoints (mobile-first) in Tailwind config
- [ ] T103 [P] Add custom Tailwind colors: karuta-red, karuta-gold in apps/web/tailwind.config.js
- [ ] T104 Optimize Vite build: code splitting for react-vendor and firebase-vendor in apps/web/vite.config.ts
- [ ] T105 Configure Firebase Hosting rewrites for SPA in firebase.json
- [ ] T106 Build frontend: npm run build in apps/web/
- [ ] T107 Preview production build locally: npm run preview in apps/web/
- [ ] T108 Deploy to Firebase Hosting: firebase deploy --only hosting
- [ ] T109 Verify Hosting URL: https://<project-id>.web.app
- [ ] T110 Test: Complete practice session on deployed site
- [ ] T111 Test: Login and set up profile on deployed site
- [ ] T112 Test: Submit official record on deployed site
- [ ] T113 Test: View banzuke on deployed site
- [ ] T114 Test: Verify Security Rules enforced on deployed site (attempt unauthorized write)
- [ ] T115 Monitor Cloud Functions logs: firebase functions:log --only submitOfficialRecord
- [ ] T116 Set up Firebase Console alerts for function errors (> 5% error rate)
- [ ] T117 Document environment setup in README.md (link to quickstart.md)

---

## Task Summary

**Total Tasks**: 117

### By Phase
- **Phase 1 (Setup)**: 22 tasks (T001-T022)
- **Phase 2 (US1 - Practice)**: 15 tasks (T023-T037)
- **Phase 3 (US2 - Auth)**: 14 tasks (T038-T051)
- **Phase 4 (US3 - Submission)**: 22 tasks (T052-T073)
- **Phase 5 (US4 - Banzuke)**: 15 tasks (T074-T088)
- **Phase 6 (Security)**: 11 tasks (T089-T099)
- **Phase 7 (Deploy)**: 18 tasks (T100-T117)

### Parallelization Opportunities

**Phase 1**: 11 parallel tasks (T002, T003, T004, T008, T009, T010, T011, T012, T021, T022)
**Phase 2**: 5 parallel tasks (T023, T024, T025, T026, T028)
**Phase 3**: 3 parallel tasks (T038, T039, T042, T043)
**Phase 4**: 8 parallel tasks (T052, T053, T054, T055, T056, T057, T058, T059, T062)
**Phase 5**: 2 parallel tasks (T074, T075)
**Phase 6**: 4 parallel tasks (T089, T090, T091, T092)
**Phase 7**: 4 parallel tasks (T100, T101, T102, T103)

**Total Parallel Tasks**: 37 out of 117 (31.6% can run concurrently)

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
┌───┴────┬─────────┐
│        │         │
Phase 2  Phase 3  Phase 5
(US1)    (US2)    (can run in parallel)
   │        │
   └────┬───┘
        ↓
    Phase 4 (US3)
    (requires US1 + US2)
        ↓
    Phase 5 (US4)
    (requires US3)
        ↓
    Phase 6 (Security)
    (can run anytime after Phase 1)
        ↓
    Phase 7 (Deploy)
    (requires all phases)
```

**Critical Path**: Phase 1 → Phase 2 (US1) → Phase 3 (US2) → Phase 4 (US3) → Phase 5 (US4) → Phase 7

**Optimization**: US1 and US2 can be developed in parallel after Phase 1

---

## Milestones Mapping (from user input)

| Milestone | Tasks Covered | Completion Criteria |
|-----------|--------------|---------------------|
| **M0**: Firebase setup | T007-T019 | Firestore, Auth, Functions, Hosting initialized |
| **M1**: Poems seed | T013-T016 | 100 poems in Firestore, verified |
| **M2**: Practice UI | T023-T037 | 10-question session with 8 choices and timing |
| **M3**: User profile | T038-T051 | Nickname + banzukeConsent flow complete |
| **M4**: Callable submitOfficialRecord | T052-T073 | Score calculation, anomaly detection, Firestore write |
| **M5**: Banzuke display | T074-T088 | Today's rankings with correct sort order |
| **M6**: Security Rules | T089-T099 | Submissions tamper-proof, rules enforced |
| **M7**: Hosting deploy | T100-T117 | Live site with full end-to-end flow |

---

## Implementation Strategy

### MVP First (Minimum Viable Product)

**Recommended MVP Scope**: Phase 1 + Phase 2 (US1)
- Delivers immediate training value (practice sessions)
- No auth or server-side dependencies
- Can be deployed to Hosting for user testing

**MVP Tasks**: T001-T037 (37 tasks)

### Incremental Delivery

**Iteration 1**: Phase 1 + Phase 2 (US1) → Practice-only MVP
**Iteration 2**: + Phase 3 (US2) → Add authentication and profile
**Iteration 3**: + Phase 4 (US3) → Add official submission with Cloud Functions
**Iteration 4**: + Phase 5 (US4) → Add banzuke rankings
**Iteration 5**: + Phase 6 + Phase 7 → Security hardening and production deployment

### Parallel Development

**Track 1**: Frontend developer focuses on US1 (Practice) + US4 (Banzuke UI)
**Track 2**: Backend developer focuses on US3 (Cloud Functions) + US6 (Security Rules)
**Track 3**: Full-stack developer handles US2 (Auth) integration

---

## Testing Strategy

### Unit Tests (per User Story)

**US1 - Practice**:
- `utils/timer.test.ts`: PrecisionTimer accuracy
- `utils/random.test.ts`: Random selection without duplicates
- `services/practice.service.test.ts`: Question generation with 8 choices (1 correct + 7 decoys)

**US2 - Auth**:
- `services/auth.service.test.ts`: signInWithGoogle, signInAnonymous
- `services/users.service.test.ts`: createUser, updateUser validation
- `hooks/useAuth.test.ts`: Auth state management

**US3 - Submission**:
- `functions/src/lib/scoreCalculator.test.ts`: Score formula correctness
- `functions/src/lib/anomalyDetector.test.ts`: 3 anomaly rules
- `functions/src/lib/jstDate.test.ts`: JST date calculation (midnight boundary)

**US4 - Banzuke**:
- `services/banzuke.service.test.ts`: Query filtering and sorting
- `hooks/useBanzuke.test.ts`: Caching and refresh logic

### Integration Tests

**End-to-End Flow**:
1. Load poems from Firestore
2. Complete 10-question practice session
3. Login with Google authentication
4. Set up profile (nickname + banzukeConsent)
5. Submit official record
6. Verify submission appears in banzuke
7. Verify reference record (anomaly) excluded from banzuke

**Security Tests**:
1. Attempt to write to poems collection → blocked
2. Attempt to write to other user's profile → blocked
3. Attempt to create submission from client → blocked
4. Verify Cloud Functions can write submissions (Admin SDK bypasses rules)

---

## File Path Reference

### Frontend (apps/web/src/)

**Services**:
- `services/firebase.ts` - Firebase initialization
- `services/auth.service.ts` - Authentication (Google, anonymous)
- `services/users.service.ts` - User profile CRUD
- `services/poems.service.ts` - Poems queries
- `services/practice.service.ts` - Practice session logic
- `services/submission.service.ts` - Official submission (calls Cloud Function)
- `services/banzuke.service.ts` - Banzuke queries

**Pages**:
- `pages/HomePage.tsx` - Landing page with "練習開始" button
- `pages/PracticePage.tsx` - 10-question practice session
- `pages/ResultPage.tsx` - Session results with "公式提出" button
- `pages/ProfileSetupPage.tsx` - Nickname + banzukeConsent form
- `pages/BanzukePage.tsx` - Daily rankings table

**Components**:
- `components/Layout.tsx` - Page layout wrapper
- `components/Header.tsx` - Navigation with login/logout
- `components/PracticeQuestion.tsx` - Display yomi + 8 tori choices
- `components/ProtectedRoute.tsx` - Auth guard
- `components/ProfileCompleteRoute.tsx` - Profile completeness guard
- `components/ErrorBoundary.tsx` - Error handling
- `components/LoadingSpinner.tsx` - Loading states

**Hooks**:
- `hooks/useAuth.ts` - Authentication state
- `hooks/useUserProfile.ts` - User profile state
- `hooks/usePoems.ts` - Poems data caching
- `hooks/usePracticeSession.ts` - Practice session state
- `hooks/useBanzuke.ts` - Banzuke data caching

**Utils**:
- `utils/timer.ts` - PrecisionTimer (performance.now())
- `utils/random.ts` - Random selection utilities
- `utils/jstDate.ts` - Client-side JST date formatting

**Types**:
- `types/poem.ts` - Poem interface
- `types/user.ts` - User interface
- `types/submission.ts` - Submission, SubmitPayload, SubmitResponse interfaces
- `types/practice.ts` - PracticeSession, Question interfaces

### Cloud Functions (functions/src/)

**Main**:
- `index.ts` - Admin SDK init, function exports
- `submitOfficialRecord.ts` - Callable function implementation

**Lib**:
- `lib/scoreCalculator.ts` - Score formula
- `lib/anomalyDetector.ts` - 3 anomaly detection rules
- `lib/jstDate.ts` - Server-side JST date calculation

**Types**:
- `types/submission.ts` - Server-side types (Timestamp instead of Date)
- `types/validation.ts` - Validation error types

### Scripts

- `scripts/poems.seed.json` - 100 poems seed data
- `scripts/seed-poems.ts` - Seed script using Admin SDK

### Firebase Config

- `firebase/firestore.rules` - Security Rules
- `firebase/firestore.indexes.json` - Composite indexes
- `firebase.json` - Hosting configuration

---

## Next Steps

1. **Start with MVP**: Implement Phase 1 + Phase 2 (T001-T037)
2. **Deploy MVP**: Test practice-only flow on Firebase Hosting
3. **Iterate**: Add US2, US3, US4 incrementally
4. **Harden Security**: Implement Phase 6 before public launch
5. **Monitor**: Set up Firebase Console alerts for errors and performance

**Ready to begin implementation!** 🚀

Use `/speckit.implement` to execute tasks automatically or implement manually following file paths above.
