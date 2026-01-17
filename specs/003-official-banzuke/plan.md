# Implementation Plan: Phase 0 - Official Banzuke System

**Branch**: `003-official-banzuke` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-official-banzuke/spec.md`

## Summary

Implement a competitive 百人一首 karuta training platform where users practice 10-question multiple-choice sessions (8 tori choices per yomi), submit results as official records via server-side validation (Cloud Functions Callable), and view daily rankings (banzuke). Server calculates scores, detects anomalies, and ensures tamper-proof official records. Phase 0 MVP focuses on core competitive loop: practice → submit → rank.

**Technical Approach**: Vite + React + TypeScript SPA with Firebase backend (Auth, Firestore, Cloud Functions Callable, Hosting). Server-side validation via Cloud Functions ensures score integrity and anomaly detection. Client measures timing with millisecond precision, server validates and stores official/reference records.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Node.js 18+ (Cloud Functions)
**Primary Dependencies**:
- Frontend: React 18, React Router 6, Vite 5, Tailwind CSS 3
- Backend: Firebase SDK 10.x (Auth, Firestore), Firebase Admin SDK (Cloud Functions)
- Build: Vite, TypeScript, ESLint

**Storage**: Firebase Firestore (3 collections: poems, users, submissions)
**Testing**: Vitest (unit), Playwright (E2E - optional for Phase 0)
**Target Platform**: Web browsers (modern, ES2020+), Firebase Cloud Functions (Node.js 18 runtime)
**Project Type**: Web application (frontend SPA + backend Cloud Functions)
**Performance Goals**:
- Practice session load < 2 seconds
- Official submission roundtrip < 2 seconds
- Banzuke query/display < 3 seconds (up to 100 records)
- Client-side timing precision: millisecond accuracy

**Constraints**:
- Firebase Blaze plan cost < ¥10,000/month
- Callable Functions invocations limited to official submissions only (not practice sessions)
- Firestore reads/writes minimized (no multi-read aggregation queries)
- Security Rules must block all client writes to submissions collection
- JST timezone calculations server-side only (client timezone untrusted)

**Scale/Scope**:
- Phase 0: < 100 daily active users, < 1000 total submissions/day
- 100 poems (fixed seed data)
- 4 pages (Home, Practice, Result, Banzuke)
- 1 Cloud Function (submitOfficialRecord - Callable)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Alignment with Constitution v6.0.0

✅ **Tech Stack Compliance**:
- Frontend: Vite + React + TypeScript ✅ (constitution line 22)
- CSS: Tailwind CSS ✅ (constitution line 23)
- Backend: Firebase Auth, Firestore, Cloud Functions Callable ✅ (constitution line 24)
- Hosting: Firebase Hosting ✅ (constitution line 25)
- No Next.js ✅ (constitution line 100)

✅ **Data Model Compliance**:
- poems/{poemId}: order, yomi, yomiKana, tori, toriKana, kimariji, kimarijiCount, author ✅ (constitution lines 44-50)
- users/{uid}: nickname, banzukeConsent, createdAt, updatedAt ✅ (constitution lines 52-56)
- submissions/{submissionId}: uid, mode, questionCount, correctCount, elapsedMs, avgMs, score, official, invalidReasons, dayKeyJst, serverSubmittedAt ✅ (constitution lines 58-70)

✅ **Security Compliance**:
- Official records created by Cloud Functions Callable only ✅ (constitution line 36)
- Client writes to submissions blocked by Security Rules ✅ (constitution line 37)
- Server-side anomaly detection ✅ (constitution line 38)
- Server-side score calculation ✅ (constitution line 40)

✅ **Business Logic Compliance**:
- Score formula: `score = max(0, correctCount * 100 + round(max(0, 300 - elapsedMs/1000)))` ✅ (constitution lines 76-79)
- Anomaly detection: elapsedMs < 2000, correctCount range, questionCount != 10 ✅ (constitution lines 86-88)
- JST timezone for dayKeyJst ✅ (constitution lines 94-95)
- Fixed mode: "choice8", 10 questions ✅ (constitution lines 60-61)

✅ **Cost Compliance**:
- Callable Functions only for official submissions (limited invocations) ✅ (constitution line 30)
- Minimize Firestore reads/writes ✅ (constitution line 31)
- No scheduled functions in Phase 0 ✅ (constitution line 102)

**Gate Status**: ✅ PASS - All constitution requirements aligned

## Project Structure

### Documentation (this feature)

```text
specs/003-official-banzuke/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (technology decisions)
├── data-model.md        # Phase 1 output (entity schemas)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (Cloud Functions API)
│   └── submitOfficialRecord.yaml
├── checklists/          # Quality validation
│   └── requirements.md
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
apps/
└── web/                          # Vite + React SPA
    ├── src/
    │   ├── main.tsx              # Entry point
    │   ├── App.tsx               # Router setup
    │   ├── components/           # Shared React components
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
    │   │   ├── submission.service.ts # Official submission (calls Cloud Function)
    │   │   └── banzuke.service.ts # Banzuke queries
    │   ├── hooks/                # Custom React hooks
    │   │   ├── useAuth.ts
    │   │   ├── usePoems.ts
    │   │   └── usePracticeSession.ts
    │   ├── types/                # TypeScript types
    │   │   ├── poem.ts
    │   │   ├── user.ts
    │   │   ├── submission.ts
    │   │   └── practice.ts
    │   ├── utils/                # Utilities
    │   │   ├── timer.ts          # High-precision timing
    │   │   └── random.ts         # Random poem selection
    │   └── styles/               # Global styles
    │       └── index.css
    ├── public/                   # Static assets
    ├── .env.example              # Environment template
    ├── .env                      # Environment variables (gitignored)
    ├── vite.config.ts            # Vite configuration
    ├── tailwind.config.js        # Tailwind configuration
    ├── tsconfig.json             # TypeScript configuration
    └── package.json

functions/                        # Firebase Cloud Functions
├── src/
│   ├── index.ts                  # Functions export
│   ├── submitOfficialRecord.ts   # Callable function
│   ├── lib/
│   │   ├── scoreCalculator.ts    # Score formula
│   │   ├── anomalyDetector.ts    # Anomaly detection logic
│   │   └── jstDate.ts            # JST date calculation
│   └── types/
│       ├── submission.ts         # Shared types
│       └── validation.ts
├── package.json
└── tsconfig.json

scripts/                          # Seed & utility scripts
├── seed-poems.ts                 # Poems seed script
├── poems.seed.json               # 100 poems data
└── service-account-key.json      # Firebase admin key (gitignored)

firebase/                         # Firebase configuration
├── firestore.rules               # Security Rules
├── firestore.indexes.json        # Firestore indexes
└── firebase.json                 # Firebase project config
```

**Structure Decision**: Web application with frontend (apps/web) and backend (functions). Frontend is Vite + React SPA deployed to Firebase Hosting. Backend is single Cloud Functions Callable for official submission validation. Seed scripts live in /scripts for one-time setup. Firebase configuration in /firebase for deployment rules.

## Complexity Tracking

**No violations** - All design decisions align with constitution v6.0.0.

## Milestones (from user input)

**M0**: Firebase project setup (Auth/Firestore/Functions/Hosting)
- Create Firebase project with Blaze plan
- Enable Authentication (Google + Anonymous)
- Initialize Firestore database
- Configure Cloud Functions
- Set up Firebase Hosting

**M1**: Poems seed and read verification
- Validate poems.seed.json (100 poems)
- Run seed script to populate poems collection
- Verify Firestore query retrieves all 100 poems

**M2**: Practice UI complete (10 questions, 8 choices, timing)
- Practice page displays yomi with 8 tori choices
- High-precision timer (millisecond accuracy)
- 10-question session with result summary

**M3**: User profile flow complete (nickname + consent)
- Authentication (Google/anonymous)
- Profile setup page for nickname and banzukeConsent
- Redirect logic if profile incomplete

**M4**: Callable submitOfficialRecord implementation (score calculation, anomaly detection, storage)
- Cloud Functions Callable: submitOfficialRecord
- Server-side score calculation
- Anomaly detection (3 rules)
- Submission document creation with official flag

**M5**: Banzuke display (today's official records, query-based)
- Banzuke page queries submissions (official=true, dayKeyJst=today)
- Sorted by score DESC, tiebreaker serverSubmittedAt ASC
- Display rank, nickname, score, correctCount, avgMs

**M6**: Firestore Rules validation (official data tamper-proof)
- Security Rules block client writes to submissions
- Verify only Cloud Functions can create submissions
- Test rules with Firebase Emulator

**M7**: Hosting deployment (minimal working system)
- Build frontend with Vite
- Deploy to Firebase Hosting
- End-to-end test: practice → submit → banzuke

## Done Definition (Phase 0 completion criteria)

✅ **Core Flow**: 10-question practice → result display → official submission → appears in today's banzuke
✅ **Anomaly Detection**: Invalid submissions marked official=false and excluded from banzuke
✅ **Security**: Client cannot create submissions directly (Security Rules enforcement verified)
✅ **Data Integrity**: Score calculated server-side, dayKeyJst calculated in JST timezone
✅ **Deployment**: Live on Firebase Hosting with working authentication and data flow

## Implementation Strategy

### Phase 0: Research (this command generates research.md)

Research and document technical decisions for:
1. **Firebase Cloud Functions best practices** - Callable functions, error handling, TypeScript setup
2. **Vite + React + TypeScript project structure** - Recommended patterns, build optimization
3. **Tailwind CSS integration with Vite** - Configuration, purging, design system
4. **High-precision browser timing APIs** - Performance.now() vs Date.now(), precision guarantees
5. **Firestore Security Rules patterns** - Function-only writes, user-owned data, read access control
6. **Firestore query optimization** - Composite indexes for banzuke sorting, query limits
7. **JST timezone handling in Node.js** - date-fns-tz, Intl.DateTimeFormat, or manual offset
8. **Firebase Admin SDK setup** - Service account, initialization in Cloud Functions
9. **React Router v6 patterns** - Protected routes, authentication guards
10. **TypeScript shared types** - Sharing types between frontend and Cloud Functions

### Phase 1: Design (this command generates data-model.md, contracts/, quickstart.md)

**Artifacts to generate**:
1. **data-model.md**: Detailed schemas for Poem, User, Submission entities with validation rules
2. **contracts/submitOfficialRecord.yaml**: OpenAPI-style contract for Cloud Functions Callable
3. **quickstart.md**: Developer onboarding guide (prerequisites, setup, Firebase config, seed poems, deploy)

**Design decisions**:
- Entity schemas with Firestore field types
- Validation rules (client-side + server-side)
- API contract for submitOfficialRecord (request/response)
- Security Rules pseudo-code
- Firestore indexes needed for banzuke query
- Environment variables structure

### Phase 2: Tasks (separate command: /speckit.tasks)

Tasks will be organized by user story:
- **Setup Phase**: Firebase project, Vite app, dependencies
- **US1 - Practice Play**: Poems service, practice logic, timing, UI
- **US2 - Auth & Profile**: Firebase Auth, user CRUD, profile setup flow
- **US3 - Official Submission**: Cloud Functions, score calculation, anomaly detection, submission creation
- **US4 - Banzuke**: Query logic, sorting, display UI

Each task will include file paths, dependencies, and independent test criteria.

---

**Next Steps**: This plan will now execute Phase 0 (Research) and Phase 1 (Design) to generate:
- research.md (technology decisions)
- data-model.md (entity schemas)
- contracts/submitOfficialRecord.yaml (API contract)
- quickstart.md (developer guide)
