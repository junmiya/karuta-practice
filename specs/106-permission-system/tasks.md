# Tasks: 権限システム整理

**Input**: Design documents from `/specs/106-permission-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Backend unit tests for `adminAuth.ts`. Manual validation for frontend guard and user management UI.

**Organization**: Tasks grouped by phase for sequential implementation.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in all descriptions

---

## Phase 1: 型定義・共通ユーティリティ

**Purpose**: SiteRole 型と権限チェックの共通基盤を構築

- [ ] T001 [P] Add `SiteRole` type (`'admin' | 'uchideshi' | 'user' | 'banned'`) and `siteRole?: SiteRole` field to `User` interface in apps/web/src/types/user.ts
- [ ] T002 [P] Create `lib/adminAuth.ts` in functions/src/lib/adminAuth.ts: export `SiteRole` type, `getSiteRole(uid)` (Firestore lookup, default 'user'), `isAdmin(uid)` (FUNCTIONS_EMULATOR bypass + ADMIN_UIDS fallback + Firestore check), `requireAuth(context)` (auth check, return uid), `requireAdmin(context)` (auth + admin check, return uid)

**Checkpoint**: 型定義と共通ユーティリティが存在する。ビルドが通る。

---

## Phase 2: バックエンド移行

**Purpose**: V2管理関数のローカル権限チェックを共通ユーティリティに置き換え、V1を削除

- [ ] T003 Replace local `isAdmin`/`requireAdmin` in functions/src/adminFunctionsV2.ts with import from `./lib/adminAuth`. Remove `ADMIN_UIDS` constant and local `isAdmin`/`requireAdmin` functions (lines 19-37). Add `await` to all `requireAdmin(context)` calls (approximately 15 箇所). Move inline `import * as admin` and `const db` to top-level imports.
- [ ] T004 Delete functions/src/adminFunctions.ts (V1 — 502 lines, not exported from index.ts, completely unused)
- [ ] T005 [P] Update Firestore security rules in firestore.rules: modify `match /users/{uid}` to allow read for authenticated owner, allow write for authenticated owner EXCEPT `siteRole` field changes (prevent client-side siteRole modification)

**Checkpoint**: `cd functions && npm run build` が通る。V1削除済み。Firestore rules更新済み。

---

## Phase 3: フロントエンド権限読み取り・ガード

**Purpose**: フロントエンドで siteRole を認識し、管理ダッシュボードを admin のみに制限

- [ ] T006 Update `getUserProfile()` in apps/web/src/services/users.service.ts to read `siteRole` field from Firestore document and include it in returned `User` object. Also update `getCachedUserProfile` deserialization to include `siteRole`.
- [ ] T007 Add `siteRole`, `isAdmin`, `isUchideshi` to return value in apps/web/src/hooks/useAuth.ts: derive `siteRole` from `state.userProfile?.siteRole || 'user'`, `isAdmin` from `siteRole === 'admin'`, `isUchideshi` from `siteRole === 'admin' || siteRole === 'uchideshi'`
- [ ] T008 Add `siteRole: SiteRole`, `isAdmin: boolean`, `isUchideshi: boolean` to `AuthContextValue` interface in apps/web/src/contexts/AuthContext.tsx
- [ ] T009 Create `AdminRoute` component in apps/web/src/components/AdminRoute.tsx: use `useAuthContext()`, show loading spinner while loading, redirect to `/` if not authenticated or not admin, render children if admin. Follow `ProtectedRoute.tsx` pattern.
- [ ] T010 Wrap `/admin` route with `AdminRoute` guard in apps/web/src/App.tsx: `<Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />`

**Checkpoint**: `cd apps/web && npx tsc --noEmit` が通る。非admin ユーザーが `/admin` にアクセスするとリダイレクトされる。

---

## Phase 4: ユーザー管理 Cloud Functions

**Purpose**: 管理者がユーザーの siteRole を管理するための API

- [ ] T011 Add `adminGetUsers` Cloud Function in functions/src/adminFunctionsV2.ts: `requireAdmin(context)`, accept `{ siteRole?: string, nickname?: string, limit?: number }`, query `users` collection with optional filters, return `{ success: true, users: { uid, nickname, siteRole, createdAt }[] }`
- [ ] T012 Add `adminSetUserRole` Cloud Function in functions/src/adminFunctionsV2.ts: `requireAdmin(context)`, accept `{ targetUid: string, newRole: SiteRole }`, validate newRole is valid SiteRole, reject if targetUid === adminUid (self-change prevention), update `users/{targetUid}.siteRole` via Admin SDK, write audit log, return `{ success: true }`
- [ ] T013 [P] Export `adminGetUsers` and `adminSetUserRole` from functions/src/index.ts
- [ ] T014 [P] Add `adminGetUsers` and `adminSetUserRole` wrapper functions in apps/web/src/services/admin-v2.service.ts using `httpsCallable` pattern

**Checkpoint**: `cd functions && npm run build` が通る。Cloud Functions がデプロイ可能。

---

## Phase 5: ユーザー管理 UI

**Purpose**: 管理者がダッシュボードからユーザーの siteRole を管理するUI

- [ ] T015 Add 5th tab「ユーザー」to AdminPage in apps/web/src/pages/AdminPage.tsx: tab button with `activeTab === 'users'`, tab content section with user management UI. Include: (1) nickname search input, (2) siteRole filter dropdown (all/admin/uchideshi/user/banned), (3) user list table (nickname, uid, siteRole, createdAt), (4) siteRole change dropdown per user row with confirm dialog, (5) success/error message display. Use existing `adminGetUsers`/`adminSetUserRole` from admin-v2.service.ts. Follow existing tab pattern in AdminPage.

**Checkpoint**: 管理者がユーザー管理タブでユーザー一覧表示、siteRole変更ができる。

---

## Phase 6: ビルド・検証

**Purpose**: ビルド確認と手動テスト

- [ ] T016 [P] Run TypeScript build check for frontend: `cd apps/web && npx tsc --noEmit`
- [ ] T017 [P] Run Vite production build: `cd apps/web && npm run build`
- [ ] T018 [P] Run Functions build: `cd functions && npm run build`
- [ ] T019 Create backend unit test in functions/src/__tests__/adminAuth.test.ts: test `getSiteRole` returns 'user' for missing siteRole, `isAdmin` returns true for admin siteRole, `isAdmin` returns true for ADMIN_UIDS match, `requireAdmin` throws for non-admin
- [ ] T020 Run manual end-to-end testing: (1) Firebase Console で siteRole: "admin" 設定, (2) admin ログイン → /admin アクセス → ダッシュボード表示, (3) 別ユーザーログイン → /admin → リダイレクト確認, (4) ユーザー管理タブで内弟子ロール付与, (5) 内弟子ユーザーでログイン → 管理画面アクセス不可を確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies — start immediately
- **Phase 2**: Depends on Phase 1 (T002: adminAuth.ts)
- **Phase 3**: Depends on Phase 1 (T001: User type). Can partially overlap with Phase 2.
- **Phase 4**: Depends on Phase 2 (adminAuth import in adminFunctionsV2.ts)
- **Phase 5**: Depends on Phase 3 (AuthContext) + Phase 4 (Cloud Functions)
- **Phase 6**: Depends on all phases

### Parallel Opportunities

**Phase 1** (all tasks parallel):
```
T001 (frontend type) || T002 (backend utility)
```

**Phase 2** (T003 first, then T004/T005 parallel):
```
T003 (V2 migration) → T004 (V1 deletion) || T005 (firestore rules)
```

**Phase 3** (sequential within, T006→T007→T008→T009→T010):
```
T006 (users.service) → T007 (useAuth) → T008 (AuthContext) → T009 (AdminRoute) → T010 (App.tsx)
```

**Phase 4**:
```
T011 (adminGetUsers) → T012 (adminSetUserRole) → T013 (index.ts) || T014 (service wrapper)
```

---

## Notes

- `adminFunctionsV2.ts` は Phase 2 と Phase 4 の両方で修正される（Phase 2: 既存関数の移行、Phase 4: 新関数追加）
- `AdminPage.tsx` は Phase 5 のみで修正（新タブ追加）
- フロントエンドのガードは UX 目的。セキュリティはバックエンドの `requireAdmin()` が担保
- エミュレータ環境では `isAdmin` が常に true を返すため、開発フローに影響なし
