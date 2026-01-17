# Tasks: Phase 0 - Foundation Infrastructure

**Branch**: `001-phase0-foundation` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Implementation Phases

### Phase 1: Project Setup (Step 1)

> **Goal**: Initialize the project structure with Vite, React, TypeScript, and Tailwind CSS.
> **Verification**: `npm run dev` displays TopPage and BasicPage with navigation.

- [ ] T001 Initialize project structure
  - Create `apps/web` directory
  - Initialize Vite project (react-ts) in `apps/web`
  - Install dependencies (`react-router-dom`)
  - TARGET: `apps/web/package.json`
- [ ] T002 [P] Configure Tailwind CSS
  - Install Tailwind CSS dependencies
  - Initialize tailwind config
  - Update `index.css`
  - TARGET: `apps/web/tailwind.config.js`, `apps/web/src/index.css`
- [ ] T003 Implement initial routing
  - Create `src/pages/TopPage.tsx` (stub)
  - Create `src/pages/BasicPage.tsx` (stub)
  - Configure `App.tsx` with routes
  - TARGET: `apps/web/src/App.tsx`
- [ ] T004 Setup linting and formatting
  - Configure ESLint and Prettier
  - TARGET: `apps/web/.eslintrc.cjs`, `apps/web/.prettierrc`

### Phase 2: Foundation Infrastructure (Step 2)

> **Goal**: Establish Firebase connection and secure configuration management.
> **Verification**: Firebase client initializes without errors.

- [ ] T005 Setup environment variables
  - Create `.env.example`
  - Configure `.gitignore`
  - TARGET: `apps/web/.env.example`, `apps/web/.gitignore`
- [ ] T006 [P] Implement Firebase initialization
  - Install `firebase` SDK
  - Create initialization logic
  - Export Firestore instance
  - TARGET: `apps/web/src/lib/firebase.ts`

### Phase 3: User Story 3 - Seed Poems Data (Step 4)

> **Goal**: Enable data seeding for development and testing. This is a prerequisite for US2.
> **Verification**: `npm run seed:poems` seeds 100 poems to Firestore.

- [ ] T007 [US3] Create seed script
  - Create `scripts/seed_poems.ts`
  - Implement upsert logic (`setDoc` with merge)
  - Add `seed:poems` script to root `package.json`
  - TARGET: `scripts/seed_poems.ts`, `package.json`
- [ ] T008 [US3] Prepare seed data
  - Ensure `data/poems.seed.json` is in place (Already done)
  - Verify JSON structure matches `contracts/firestore-schema.md`
  - TARGET: `data/poems.seed.json` (Verify only)

### Phase 4: User Story 2 - View Poem Cards (Step 3)

> **Goal**: Display poems from Firestore on the Basic page.
> **Verification**: Basic page displays 100 poems in correct order.

- [ ] T009 [US2] Define Poem type
  - Create TypeScript interface matching schema
  - TARGET: `apps/web/src/types/poem.ts`
- [ ] T010 [P] [US2] Create PoemCard component
  - Implement card UI with `yomi` and `order`
  - Use Tailwind for styling
  - TARGET: `apps/web/src/components/PoemCard.tsx`
- [ ] T011 [US2] Implement BasicPage logic
  - Fetch poems from Firestore (ordered by `order`)
  - Handle loading/error/empty states
  - Render PoemCard list
  - TARGET: `apps/web/src/pages/BasicPage.tsx`

### Phase 5: User Story 1 - Top Page Navigation (Step 1 Refinement)

> **Goal**: Complete the Top page UI and navigation flow.
> **Verification**: User can navigate from Top to Basic page.

- [ ] T012 [P] [US1] Implement TopPage UI
  - Add service title and description
  - Add navigation button to `/basic`
  - TARGET: `apps/web/src/pages/TopPage.tsx`

### Phase 6: Deployment & Documentation (Steps 5 & 6)

> **Goal**: Prepare for deployment and verify documentation.
> **Verification**: `firebase deploy` succeeds and site works on Hosting.

- [ ] T013 Configure Firebase Hosting
  - Create `firebase.json` with SPA rewrite
  - Create `.firebaserc`
  - TARGET: `firebase.json`
- [ ] T014 Configure Firestore Rules
  - Create `firestore.rules` (read-only for poems)
  - TARGET: `firestore.rules`
- [ ] T015 Create README
  - Document setup, seed, and deployment steps
  - TARGET: `README.md`

## Dependencies

- Phase 1 (Setup) -> All other phases
- Phase 2 (Firebase) -> Phase 3 (Seed) & Phase 4 (View)
- Phase 3 (Seed) -> Phase 4 (View) (Data needed for verify)
- Phase 4 (View) -> Phase 6 (Deploy)
