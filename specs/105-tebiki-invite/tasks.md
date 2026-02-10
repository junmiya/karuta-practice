# Tasks: 手引タブ（導入・遊び方・友招待）増設

**Input**: Design documents from `/specs/105-tebiki-invite/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/invite-api.yaml, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted. Manual validation included in Phase 7.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Type Definitions)

**Purpose**: Shared type definitions used by both frontend and backend

- [x] T001 [P] Create frontend invite type definitions (Invite, InviteSettings, InviteStatus, TargetMode, CreateInviteInput/Output, GetInviteInfoInput/Output, JoinInviteInput/Output) in apps/web/src/types/invite.ts
- [x] T002 [P] Create backend invite type definitions (InviteDoc, InviteSettings, TargetMode, TARGET_MODE_CONFIG with URL mappings and auth requirements, INVITE_DEFAULTS with 24h expiry) in functions/src/types/invite.ts

---

## Phase 2: Foundational (Backend + Infrastructure)

**Purpose**: Cloud Functions, services, and config that MUST be complete before frontend user stories

**Note**: All invite operations go through Cloud Functions — Firestore rules are `allow read, write: if false` for invites collection (server-only access per data-model.md security revision)

- [x] T003 Implement invite service business logic in functions/src/services/tebikiInviteService.ts: generateShortCode (6-char alphanumeric from 32-char safe set, collision check), createInvite (generate inviteId + inviteCode, write to Firestore with 24h expiry and default settings), getInviteByIdOrCode (lookup by inviteId or inviteCode query), validateInvite (check status/expiry), joinInvite (validate + increment usageCount + build redirect URL from settings→URLSearchParams per data-model.md mapping), buildRedirectUrl (targetMode→start URL with settings params)
- [x] T004 Implement Cloud Functions in functions/src/inviteFunctions.ts and export from functions/src/index.ts: createInvite (auth required, validate targetMode, call service, return inviteId/inviteCode/inviteUrl/expiresAt), getInviteInfo (no auth required, accept inviteId or inviteCode, return status/targetMode/targetModeLabel/requiresAuth/settings), joinInvite (optional auth — required for keiko/utaawase, call service, return redirectUrl/targetMode/targetModeLabel)
- [x] T005 [P] Create frontend invite service wrappers using httpsCallable pattern in apps/web/src/services/invite.service.ts: createInvite(targetMode), getInviteInfo(inviteId?, inviteCode?), joinInvite(inviteId?, inviteCode?) — follow group.service.ts httpsCallable<Input,Output> pattern
- [x] T006 [P] Add Firestore security rules for invites and invite_participants collections (both allow read,write: if false — server only) in firestore.rules, and add inviteCode single-field index in firestore.indexes.json

**Checkpoint**: Backend ready — all 3 Cloud Functions deployed and callable from frontend

---

## Phase 3: User Story 1 - 手引ページで百人一首の楽しさを知り、手習を始める (Priority: P1) 🎯 MVP

**Goal**: 初見ユーザーがナビの「手引」タブから手引ページを開き、5セクション（序文・百首のこと・遊びの手順・友を誘う・FAQ）を閲覧し、「一首ためす」CTAから手習を開始できる

**Independent Test**: ブラウザで /tebiki を開き、5セクションが表示されること。「一首ためす」CTAが /tenarai（実態は /）へ遷移すること。ログイン不要で完結する。

### Implementation for User Story 1

- [x] T007 [US1] Create TebikiPage with 5 sections in apps/web/src/pages/TebikiPage.tsx: (1) 序文 — 4行の固定文「ひと声で札が決まる瞬間が、気持ちよい。」等 + 「一首ためす」primary CTA (navigate to /) + 「友を誘う」secondary CTA (scroll to #invite section), (2) 百首のこと — 読札・取札・決まり字の説明 + 面白みの要約3点, (3) 遊びの手順 — 3枚のCardコンポーネント（はじめて→手習CTA, 覚える→稽古CTA, 友と→歌合CTA）, (4) 友を誘う — id="invite" anchor, placeholder text「ログインして友を招待できます」(US2で完成), (5) よくある問い — 3項目FAQ（決まり字とは？、招待リンクが開けない、ログインが必要な場面）。既存UI components (Card, Button, Heading, Text) を使用。
- [x] T008 [P] [US1] Add 手引 tab as first tab in Header navigation in apps/web/src/components/Header.tsx: TabButton with path="/tebiki" label="手引" required={false}, add isActive detection for /tebiki path, update tab order to 手引→手習→稽古→歌合→結び→歌位
- [x] T008b [P] [US1] Add first-visit banner (FR-002) prompting users to visit 手引 tab: display dismissible banner「手引：百首のこと／遊びの手順／友を誘う」with「手引を見る」CTA linking to /tebiki. Use localStorage to persist dismissed state (key: tebiki_banner_dismissed). Show banner on non-/tebiki pages when not dismissed. Implement in apps/web/src/components/Header.tsx or as a separate TebikiBanner component rendered in App.tsx.
- [x] T009 [P] [US1] Register /tebiki route (TebikiPage) and /invite/join route (InviteJoinPage placeholder) in apps/web/src/App.tsx — add imports and Route elements in the appropriate position

**Checkpoint**: 手引ページがナビから到達可能。5セクション表示。「一首ためす」で手習へ遷移。ログイン不要で閲覧可能。

---

## Phase 4: User Story 2 - ログイン済みユーザーが友人への招待を作成する (Priority: P2)

**Goal**: ログイン済みユーザーが手引ページの「友を誘う」セクションで対象モードを選び、招待リンクとコードを生成・コピーできる

**Independent Test**: ログイン状態で /tebiki を開き、「友を誘う」セクションで対象モードを選択して「招待を作る」をタップ。招待リンクとコードが表示され、コピーボタンが機能すること。

### Implementation for User Story 2

- [x] T010 [US2] Replace 「友を誘う」section placeholder in TebikiPage with full invite creation UI in apps/web/src/pages/TebikiPage.tsx: (1) useAuthContext() for login state check, (2) targetMode selector (3 buttons: 手習/稽古/歌合), (3) 「招待を作る」button → call invite.service.createInvite(targetMode), (4) result display: invite link with copy button, invite code with copy button, expiry info, (5) copy via navigator.clipboard.writeText + toast/notification「コピーしました」, (6) unauthenticated state: show login prompt with navigate to /profile, (7) loading/error states during API call

**Checkpoint**: 招待リンク・コードの作成→コピーが15秒以内に完了。未ログイン時にはログイン促進が表示。

---

## Phase 5: User Story 3 - 友人が招待リンクから参加して同条件で開始する (Priority: P2)

**Goal**: 招待リンクまたはコード入力から参加画面を表示し、「参加する」で対象モードの開始URLへリダイレクト（設定パラメータ付き）

**Independent Test**: 有効な招待リンク /invite/join?id={inviteId} を開き、参加画面が表示されること。「参加する」で対象モードの開始URLへ遷移すること。未ログイン+keiko招待の場合、ログイン後にリダイレクトが継続すること。

### Implementation for User Story 3

- [x] T011 [US3] Create InviteJoinPage in apps/web/src/pages/InviteJoinPage.tsx: (1) useSearchParams() to extract id query param, (2) useEffect to call invite.service.getInviteInfo(inviteId) on mount, (3) display invite info (targetModeLabel,「同じ条件で始めます」message), (4) 「参加する」button → call invite.service.joinInvite(inviteId) → navigate to redirectUrl, (5) if requiresAuth && !user → navigate to /profile?returnUrl=/invite/join?id={inviteId} for login redirect (follow GroupJoinPage returnUrl pattern), (6) loading state during API calls. Use existing Card, Button, Heading, Text components.
- [x] T012 [US3] Add invite code input field and join-by-code flow in TebikiPage 「友を誘う」section in apps/web/src/pages/TebikiPage.tsx: (1) text input for 6-character code (uppercase, maxLength=6), (2) 「コードで参加」button → call invite.service.getInviteInfo(undefined, inviteCode) to validate, then call joinInvite(undefined, inviteCode) → navigate to redirectUrl, (3) error display for invalid/expired codes, (4) loading state during API call

**Checkpoint**: 招待リンク経由・コード経由の両方で参加→対象モード開始まで2タップ以内。未ログイン+認証必須モードではログインリダイレクト後に継続。

---

## Phase 6: User Story 4 - 期限切れ・無効な招待へのフォールバック (Priority: P3)

**Goal**: 期限切れ・存在しない招待にアクセスした場合、エラーメッセージと「一首ためす」フォールバックCTAを表示

**Independent Test**: 存在しないinviteIdでリンクを開き、「招待が見つかりません」+「一首ためす」CTAが表示されること。期限切れIDで「期限切れです」が表示されること。

### Implementation for User Story 4

- [x] T013 [US4] Add error/fallback states to InviteJoinPage in apps/web/src/pages/InviteJoinPage.tsx: (1) handle getInviteInfo returning status="expired" → display「期限切れです」message, (2) handle getInviteInfo returning status="not_found" → display「招待が見つかりません」message, (3) both cases show「一首ためす」fallback CTA button → navigate to / (手習), (4) handle network errors with generic error message + fallback CTA
- [x] T014 [US4] Add error handling for invalid/expired code input in TebikiPage invite code section in apps/web/src/pages/TebikiPage.tsx: display specific error messages (「コードが正しくありません」「期限切れです」) based on getInviteInfo response status

**Checkpoint**: 100%の確率で期限切れ・無効招待にフォールバック導線が表示される。「一首ためす」CTAから手習ページへ遷移できる。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, deployment, and end-to-end validation

- [x] T015 Run TypeScript build check for frontend (cd apps/web && npx tsc --noEmit) and fix any type errors
- [x] T016 Run Vite production build (cd apps/web && npm run build) and fix any build errors
- [x] T017 Run Functions build (cd functions && npm run build) and fix any compilation errors
- [x] T018 Deploy to Firebase (firebase deploy --only hosting,functions) and verify /tebiki is accessible in production
- [ ] T019 Run manual end-to-end testing per quickstart.md: (1) open /tebiki — verify 5 sections, (2) login → create invite → verify link/code, (3) open invite link in incognito → verify join page, (4) click 参加する → verify redirect, (5) test expired invite → verify fallback CTA

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (type definitions)
- **US1 (Phase 3)**: Depends on Phase 2 for route registration only (T009). Static content (T007, T008) can start after Phase 1.
- **US2 (Phase 4)**: Depends on Phase 2 (Cloud Functions) + Phase 3 (TebikiPage exists)
- **US3 (Phase 5)**: Depends on Phase 2 (Cloud Functions) + Phase 3 (routes registered). US2 should be complete first to create test invites.
- **US4 (Phase 6)**: Depends on Phase 5 (InviteJoinPage exists)
- **Polish (Phase 7)**: Depends on all implemented phases

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (TebikiPage must exist as base) + Phase 2 (backend)
- **US3 (P2)**: Depends on US2 (needs created invites to test joining) + Phase 2 (backend)
- **US4 (P3)**: Depends on US3 (InviteJoinPage must exist to add error states)

### Within Each User Story

- Static content before dynamic behavior
- Backend before frontend integration
- Core flow before error handling

### Parallel Opportunities

**Phase 1** (all tasks parallel):
```
T001 (frontend types) || T002 (backend types)
```

**Phase 2** (after T003→T004 sequential, rest parallel):
```
T003 → T004 (backend service → functions, sequential)
T005 (frontend service) || T006 (rules/indexes) — parallel with each other and with T003→T004
```

**Phase 3** (after T007 created, T008/T009 parallel):
```
T007 (TebikiPage) → then:
  T008 (Header tab) || T009 (App.tsx routes) — parallel
```

**Phase 4-6**: Sequential (same files modified across stories)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Type definitions
2. Complete Phase 2: Backend + infrastructure
3. Complete Phase 3: 手引ページ + ナビ + ルート
4. **STOP and VALIDATE**: /tebiki 表示、5セクション確認、「一首ためす」遷移確認
5. Deploy if ready — 手引ページだけで初見ユーザーへの価値提供が可能

### Incremental Delivery

1. Phase 1+2 → Backend ready
2. + US1 (Phase 3) → 手引ページ公開 (MVP!)
3. + US2 (Phase 4) → 招待作成機能追加
4. + US3 (Phase 5) → 招待参加機能追加
5. + US4 (Phase 6) → エラーハンドリング完成
6. Phase 7 → 品質確認 + デプロイ

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TebikiPage.tsx is modified across US1→US2→US3→US4 (sequential within same file)
- InviteJoinPage.tsx is created in US3 and extended in US4
- Cloud Functions (Phase 2) are shared infrastructure — all invite operations are server-side
- MVP default settings (all off/empty) mean URL params are not appended in MVP — but buildRedirectUrl logic should still handle non-default settings for Phase 2 extensibility
