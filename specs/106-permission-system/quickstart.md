# Quickstart: 106-permission-system

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project configured (`.env` with `VITE_FIREBASE_*` vars)

## Development Setup

```bash
# 1. Switch to feature branch
git checkout 106-permission-system

# 2. Install dependencies
cd apps/web && npm install
cd ../../functions && npm install

# 3. Start frontend dev server
cd apps/web && npm run dev

# 4. (Optional) Start Firebase emulators for Functions testing
cd functions && npm run serve
```

## Key Files to Create

### Frontend (apps/web/src/) - New

| File | Purpose |
| ---- | ------- |
| `components/AdminRoute.tsx` | 管理者ガードコンポーネント（`/admin` 保護） |

### Frontend (apps/web/src/) - Modifications

| File | Change |
| ---- | ------ |
| `types/user.ts` | `SiteRole` 型 + `siteRole` フィールド追加 |
| `services/users.service.ts` | `getUserProfile()` で `siteRole` を読み取り |
| `hooks/useAuth.ts` | `siteRole` / `isAdmin` / `isTester` を返却値に追加 |
| `contexts/AuthContext.tsx` | `siteRole` / `isAdmin` / `isTester` をContext値に追加 |
| `App.tsx` | `/admin` を `AdminRoute` で囲む |
| `services/admin-v2.service.ts` | `adminGetUsers` / `adminSetUserRole` ラッパー追加 |
| `pages/AdminPage.tsx` | 「ユーザー管理」タブ追加 |

### Backend (functions/src/) - New

| File | Purpose |
| ---- | ------- |
| `lib/adminAuth.ts` | `isAdmin` / `requireAdmin` / `getSiteRole` 共通ユーティリティ |

### Backend (functions/src/) - Modifications

| File | Change |
| ---- | ------ |
| `adminFunctionsV2.ts` | ローカル `isAdmin`/`requireAdmin` 削除 → `lib/adminAuth` import |
| `index.ts` | `adminGetUsers` / `adminSetUserRole` export追加 |

### Backend (functions/src/) - Delete

| File | Reason |
| ---- | ------ |
| `adminFunctions.ts` | V1: `index.ts` からexportされておらず完全に未使用 |

### Config

| File | Change |
| ---- | ------ |
| `firestore.rules` | `users/{uid}` の `siteRole` 書き込み保護ルール追加 |

## Implementation Order

1. **型定義** (`user.ts` に `SiteRole` 追加)
2. **バックエンド共通** (`lib/adminAuth.ts` 作成)
3. **バックエンド移行** (`adminFunctionsV2.ts` のローカル関数を共通に切替)
4. **V1削除** (`adminFunctions.ts` 削除)
5. **Firestoreルール** (`firestore.rules` 更新)
6. **フロントエンド読み取り** (`users.service.ts` + `useAuth.ts` + `AuthContext.tsx`)
7. **フロントエンドガード** (`AdminRoute.tsx` 作成 + `App.tsx` 適用)
8. **ユーザー管理Cloud Functions** (`adminGetUsers` + `adminSetUserRole`)
9. **ユーザー管理UI** (`AdminPage.tsx` タブ追加)

## Testing

```bash
# Frontend build check
cd apps/web && npm run build

# TypeScript check
cd apps/web && npx tsc --noEmit

# Functions build
cd functions && npm run build

# Functions unit test
cd functions && npm test -- --testPathPattern=adminAuth

# Manual testing
# 1. Firebase Console で自分の users doc に siteRole: "admin" を設定
# 2. admin でログイン → /admin アクセス → ダッシュボード表示
# 3. 別ユーザーでログイン → /admin アクセス → ホームにリダイレクト
# 4. 管理者としてユーザー管理タブでtesterロール付与
# 5. testerユーザーでログイン → ベータ機能表示確認
```

## Patterns to Follow

- **Route Guard**: `ProtectedRoute.tsx` パターン（`useAuthContext` + `Navigate`）
- **Cloud Functions**: `httpsCallable<Input, Output>()` パターン（`admin-v2.service.ts`）
- **Auth Context**: `useAuth` → `AuthContext.Provider` パターン
- **Admin Check**: `requireAdmin(context)` パターン（`adminFunctionsV2.ts`）
- **UI Components**: `Card`, `Button`, `Badge`, `InfoBox` from `@/components/ui/`
