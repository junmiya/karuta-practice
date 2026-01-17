# Feature Specification: Phase 0 - Official Banzuke System

**Feature Branch**: `003-official-banzuke`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "段階0 仕様（公式記録・番付）"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practice Play (Priority: P1)

Users can practice karuta card recognition in a multiple-choice format with accurate timing measurement. The practice mode displays 10 random poems, showing yomi (上の句) and presenting 8 tori (下の句) options. Timing starts when choices appear and ends when user selects an answer.

**Why this priority**: This is the core value proposition - without practice mode, there's no content to submit or rank. It must work independently to deliver training value.

**Independent Test**: Can be fully tested by completing one 10-question practice session and viewing local results (correct count, elapsed time, average time). Delivers immediate training value without requiring authentication or official submission.

**Acceptance Scenarios**:

1. **Given** user accesses practice page, **When** practice starts, **Then** system displays yomi for first poem with 8 tori choices (1 correct + 7 random)
2. **Given** choices are displayed, **When** user clicks any choice, **Then** timing stops immediately and shows correct/incorrect feedback
3. **Given** 10 questions completed, **When** session ends, **Then** system displays summary: correctCount (0-10), elapsedMs (total), avgMs (average per question)
4. **Given** practice session completed, **When** user views results, **Then** "公式提出" (official submission) button appears with login prompt if unauthenticated

---

### User Story 2 - Authentication & Profile (Priority: P2)

Users can authenticate (Google or anonymous) and set up their profile with required nickname and banzuke consent. Profile enables official submission eligibility.

**Why this priority**: Required before official submissions, but practice can work without it. Independent slice that enables authentication flow.

**Independent Test**: Can be fully tested by logging in, setting nickname, confirming banzukeConsent=true, and verifying user document creation in Firestore users/{uid} collection.

**Acceptance Scenarios**:

1. **Given** unauthenticated user, **When** clicks login, **Then** system offers Google or anonymous authentication
2. **Given** first-time login, **When** authentication succeeds, **Then** system creates /users/{uid} document with createdAt timestamp
3. **Given** authenticated user without nickname, **When** accesses any protected feature, **Then** system prompts for nickname (必須)
4. **Given** authenticated user, **When** sets nickname and confirms banzukeConsent, **Then** system saves to /users/{uid} with updatedAt timestamp
5. **Given** user with banzukeConsent=false, **When** attempts official submission, **Then** system blocks with "同意が必要" message

---

### User Story 3 - Official Submission (Priority: P3)

Authenticated users can submit practice results as official records. System validates submission server-side via Cloud Functions Callable, calculates score, detects anomalies, and stores official/reference records in submissions collection.

**Why this priority**: Enables competitive play and official ranking. Depends on P1 (practice) and P2 (auth), but can be tested independently once those exist.

**Independent Test**: Can be fully tested by submitting practice results and verifying: (1) Cloud Function receives correct payload, (2) server calculates score correctly, (3) anomaly detection marks invalid submissions as official=false, (4) submission document created in submissions/{submissionId} with serverSubmittedAt and dayKeyJst.

**Acceptance Scenarios**:

1. **Given** authenticated user completes practice, **When** clicks "公式提出", **Then** client calls Cloud Functions Callable with payload: {questionCount, correctCount, elapsedMs}
2. **Given** Cloud Function receives submission, **When** validates data, **Then** calculates score = max(0, correctCount * 100 + round(max(0, 300 - elapsedMs/1000)))
3. **Given** Cloud Function validates submission, **When** detects elapsedMs < 2000, **Then** marks official=false with invalidReasons: ["elapsedMs too low"]
4. **Given** Cloud Function validates submission, **When** correctCount outside 0-10 range, **Then** marks official=false with invalidReasons: ["correctCount out of range"]
5. **Given** Cloud Function validates submission, **When** questionCount != 10, **Then** marks official=false with invalidReasons: ["questionCount must be 10"]
6. **Given** valid submission, **When** Cloud Function creates record, **Then** saves to submissions/{submissionId} with official=true, serverSubmittedAt (server timestamp), dayKeyJst (JST YYYY-MM-DD)
7. **Given** submission complete, **When** client receives response, **Then** displays result: "公式記録" (official=true) or "参考記録（番付反映なし）" (official=false) with invalidReasons

---

### User Story 4 - Banzuke Display (Priority: P4)

Users can view today's official banzuke (ranking) showing top performers. Ranking displays nickname, score, correctCount, avgMs for all official=true submissions from current JST day, sorted by score (desc) with tiebreaker serverSubmittedAt (asc - earlier submission ranks higher).

**Why this priority**: Completes the competitive loop by displaying rankings. Depends on P3 (official submissions), but can be tested independently by seeding sample submissions.

**Independent Test**: Can be fully tested by creating sample submissions with official=true for current dayKeyJst, then verifying banzuke page displays them sorted correctly with proper columns and tiebreaker logic.

**Acceptance Scenarios**:

1. **Given** user accesses banzuke page, **When** loads, **Then** queries submissions where official=true AND dayKeyJst=[today JST]
2. **Given** query results returned, **When** sorted, **Then** primary sort: score DESC, tiebreaker: serverSubmittedAt ASC
3. **Given** sorted results, **When** displayed, **Then** shows columns: 順位 (rank), 表示名 (nickname from users/{uid}), スコア (score), 正答数 (correctCount), 平均時間 (avgMs)
4. **Given** page header, **When** rendered, **Then** displays "公式番付（本日）" label with JST date
5. **Given** banzuke page, **When** viewed, **Then** shows disclaimer: "公式記録のみ反映 / サーバ側で異常値判定済み"

---

### Edge Cases

- **What happens when user submits extremely fast time (< 2000ms total)?** System marks as reference record (official=false) with invalidReason, does not appear in banzuke
- **What happens when two users have identical score?** Tiebreaker: earlier serverSubmittedAt ranks higher
- **What happens when user has no nickname set?** System blocks official submission and prompts nickname setup
- **What happens when user has banzukeConsent=false?** System blocks official submission with consent requirement message
- **What happens when Cloud Function receives malformed payload?** Function returns error, client displays "提出失敗" message
- **What happens when user is in different timezone?** Server always uses JST for dayKeyJst calculation, client timezone irrelevant
- **What happens when no official submissions exist for today?** Banzuke page displays "本日の公式記録はまだありません"
- **What happens when user submits multiple times in one day?** All submissions stored separately, banzuke shows all official records (can result in same user appearing multiple times)

## Requirements *(mandatory)*

### Functional Requirements

#### Pages & Navigation

- **FR-001**: Home page MUST display "練習開始" button linking to practice mode
- **FR-002**: Home page MUST display "番付（本日）" link to banzuke page
- **FR-003**: Home page MUST display nickname setup link if user authenticated but nickname not set
- **FR-004**: Practice page MUST display yomi (上の句) for current question
- **FR-005**: Practice page MUST display 8 tori (下の句) choices: 1 correct + 7 random decoys
- **FR-006**: Practice page MUST show "公式提出" button after session completion
- **FR-007**: Practice page MUST redirect to login if "公式提出" clicked while unauthenticated
- **FR-008**: Result page MUST display correctCount, elapsedMs (total), avgMs (average)
- **FR-009**: Result page MUST display submission result: "公式記録" or "参考記録（番付反映なし）" with invalidReasons if applicable
- **FR-010**: Result page MUST display "番付を見る" link to banzuke
- **FR-011**: Banzuke page MUST display header "公式番付（本日）" with JST date
- **FR-012**: Banzuke page MUST display columns: 順位, 表示名, スコア, 正答数, 平均時間(ms)
- **FR-013**: Banzuke page MUST display disclaimer about official records only

#### Data Model

- **FR-014**: poems/{poemId} MUST store: order (1-100), yomi, yomiKana, tori, toriKana, kimariji, kimarijiCount, author
- **FR-015**: poems collection MUST be read-only (no client writes)
- **FR-016**: users/{uid} MUST store: nickname (string, required), banzukeConsent (boolean, required true), createdAt, updatedAt
- **FR-017**: users/{uid} MUST allow write access only to authenticated user matching uid
- **FR-018**: submissions/{submissionId} MUST store: uid, mode ("choice8"), questionCount (10), correctCount (0-10), elapsedMs, avgMs, score, official (boolean), invalidReasons (string[]), dayKeyJst (YYYY-MM-DD), serverSubmittedAt (timestamp)
- **FR-019**: submissions collection MUST reject all client writes (Cloud Functions only)

#### Practice Play

- **FR-020**: Practice mode MUST randomly select 10 poems from poems collection
- **FR-021**: For each question, system MUST generate 8 tori choices: correct answer + 7 random decoys
- **FR-022**: Timer MUST start when choices are displayed to user
- **FR-023**: Timer MUST stop immediately when user clicks any choice
- **FR-024**: System MUST record clientElapsedMs for each question
- **FR-025**: After 10 questions, system MUST calculate summary: correctCount, total elapsedMs, avgMs

#### Authentication & Profile

- **FR-026**: System MUST support Google authentication via Firebase Auth
- **FR-027**: System MUST support anonymous authentication via Firebase Auth
- **FR-028**: On first login, system MUST create /users/{uid} document with createdAt
- **FR-029**: System MUST require nickname before allowing official submission
- **FR-030**: System MUST require banzukeConsent=true before allowing official submission

#### Cloud Functions - Official Submission

- **FR-031**: Cloud Functions Callable MUST validate payload: questionCount, correctCount, elapsedMs
- **FR-032**: Cloud Functions MUST calculate score = max(0, correctCount * 100 + round(max(0, 300 - elapsedMs/1000)))
- **FR-033**: Cloud Functions MUST detect anomaly A: elapsedMs < 2000 → official=false, invalidReasons=["elapsed time too short"]
- **FR-034**: Cloud Functions MUST detect anomaly B: correctCount outside 0-questionCount → official=false, invalidReasons=["correctCount out of range"]
- **FR-035**: Cloud Functions MUST detect anomaly C: questionCount != 10 → official=false, invalidReasons=["questionCount must be 10"]
- **FR-036**: Cloud Functions MUST calculate dayKeyJst using JST timezone (YYYY-MM-DD format)
- **FR-037**: Cloud Functions MUST set serverSubmittedAt using server timestamp (FieldValue.serverTimestamp())
- **FR-038**: Cloud Functions MUST create submission document in submissions/{submissionId} (auto-generated ID)

#### Banzuke Display

- **FR-039**: Banzuke page MUST query submissions where official=true AND dayKeyJst=[current JST date]
- **FR-040**: Banzuke MUST sort results: primary by score DESC, tiebreaker by serverSubmittedAt ASC
- **FR-041**: Banzuke MUST display nickname by joining users/{uid} on submission.uid
- **FR-042**: Banzuke MUST calculate rank (順位) as 1-indexed position in sorted list

### Key Entities

- **Poem**: Represents one of 100 百人一首 poems. Attributes: poemId (p001-p100), order (1-100), yomi (上の句 text), yomiKana (reading), tori (下の句 text), toriKana (reading), kimariji (決まり字), kimarijiCount (1-6), author (歌人). Read-only public data.

- **User**: Represents authenticated user profile. Attributes: uid (Firebase Auth UID), nickname (display name for banzuke, required), banzukeConsent (true required for official submissions), createdAt (timestamp), updatedAt (timestamp). User can only modify their own profile.

- **Submission**: Represents official or reference training record. Attributes: submissionId (auto-generated), uid (foreign key to User), mode ("choice8" fixed in Phase 0), questionCount (10 fixed), correctCount (0-10), elapsedMs (total time in milliseconds), avgMs (average time per question), score (calculated server-side), official (boolean - true if valid, false if anomaly detected), invalidReasons (array of strings explaining why official=false), dayKeyJst (JST date key YYYY-MM-DD for daily rankings), serverSubmittedAt (server timestamp for ordering). Can only be created by Cloud Functions, never by client.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete one practice session (10 questions) in under 5 minutes without errors
- **SC-002**: System accurately measures elapsed time with millisecond precision for each question
- **SC-003**: Official submission process completes in under 2 seconds from button click to result display
- **SC-004**: Anomaly detection correctly identifies and rejects submissions with elapsedMs < 2000ms as reference records
- **SC-005**: Banzuke page loads current day's rankings in under 3 seconds with up to 100 submissions
- **SC-006**: Banzuke correctly sorts users by score (descending) with tiebreaker on submission time (ascending)
- **SC-007**: Server-side score calculation produces identical results for identical input (deterministic)
- **SC-008**: System prevents client-side manipulation of score, timing, or official flag through Security Rules
- **SC-009**: Users can view their submission result immediately after Cloud Function completes
- **SC-010**: Banzuke displays only official records (official=true), excluding all reference records
- **SC-011**: System correctly calculates JST date boundaries regardless of user's local timezone
- **SC-012**: 95% of users successfully complete authentication and nickname setup on first attempt

## Assumptions *(optional)*

- Firebase project already created with Blaze plan enabled
- Firebase Hosting configured for SPA deployment
- Users understand 百人一首 terminology (yomi, tori, kimariji) - no tutorial needed in Phase 0
- Phase 0 uses fixed settings: 8 choices, 10 questions per session, choice8 mode
- Multiple submissions per day are allowed (no daily limit in Phase 0)
- Banzuke shows all official submissions, even if same user appears multiple times
- No pagination needed for banzuke in Phase 0 (assume < 100 daily submissions)
- No user deletion or account management in Phase 0
- Nickname changes not supported in Phase 0 (set once at first login)
- No scheduled functions or automated aggregation in Phase 0
- No payment/subscription system in Phase 0
- Score formula is fixed for Phase 0 (future versions may introduce scoring system changes with version field)
- Client sends minimal payload (questionCount, correctCount, elapsedMs only) - no per-question details in Phase 0
- Anomaly detection uses simple thresholds (more sophisticated detection deferred to Phase 1+)

## Dependencies *(optional)*

- Firebase SDK 10.x (Auth, Firestore, Cloud Functions client)
- Vite 5.x for build tooling
- React 18.x for UI framework
- TypeScript 5.x for type safety
- Tailwind CSS 3.x for styling
- Firebase Cloud Functions (Node.js runtime) for server-side logic
- Firebase Hosting for deployment
- poems.seed.json with 100 validated poem records

## Out of Scope *(optional)*

- Scheduled Functions for daily/seasonal aggregation (Phase 1+)
- Season (シーズン) and ranking freeze/finalization (Phase 1+)
- Historical banzuke (previous days/seasons) - only current day in Phase 0
- Payment/subscription for entry fees (Phase 1+)
- Advanced anomaly detection (pattern recognition, ML-based) (Phase 1+)
- Per-question timing details in submission payload (Phase 0 sends summary only)
- User profile editing (nickname change, avatar upload) (Phase 1+)
- Account deletion or data export (Phase 1+)
- Tutorial or onboarding flow for new users (Phase 1+)
- Mobile-specific optimizations (responsive design sufficient for Phase 0)
- Accessibility features beyond basic semantic HTML (Phase 1+)
- Internationalization (Japanese only in Phase 0)
- Admin dashboard or moderation tools (Phase 1+)
- Social features (friends, challenges, chat) (Phase 1+)
- Practice history beyond submissions (detailed training analytics deferred)
- Card browsing/flip mode from 002-phase0-karuta-training (separate feature)
