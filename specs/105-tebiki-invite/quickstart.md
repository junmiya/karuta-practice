# Quickstart: 105-tebiki-invite

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project configured (`.env` with `VITE_FIREBASE_*` vars)

## Development Setup

```bash
# 1. Switch to feature branch
git checkout 105-tebiki-invite

# 2. Install dependencies
cd apps/web && npm install
cd ../../functions && npm install

# 3. Start frontend dev server
cd apps/web && npm run dev

# 4. (Optional) Start Firebase emulators for Functions testing
cd functions && npm run serve
```

## Key Files to Create

### Frontend (apps/web/src/)

| File | Purpose |
| ---- | ------- |
| `pages/TebikiPage.tsx` | 手引ページ（5セクション + 招待コード入力） |
| `pages/InviteJoinPage.tsx` | 招待参加ページ（リンク経由） |
| `services/invite.service.ts` | Cloud Functions呼び出しラッパー |
| `types/invite.ts` | 招待関連の型定義 |

### Frontend (apps/web/src/) - Modifications

| File | Change |
| ---- | ------ |
| `components/Header.tsx` | 「手引」タブ追加（先頭位置） |
| `App.tsx` | `/tebiki`, `/invite/join` ルート追加 |

### Backend (functions/src/)

| File | Purpose |
| ---- | ------- |
| `inviteFunctions.ts` | createInvite, getInviteInfo, joinInvite Cloud Functions |
| `services/tebikiInviteService.ts` | 招待ビジネスロジック（作成・検証・参加） |
| `types/invite.ts` | バックエンド招待型定義 |

### Config

| File | Change |
| ---- | ------ |
| `firestore.rules` | invites コレクションのルール追加 |
| `firestore.indexes.json` | inviteCode インデックス追加 |

## Implementation Order

1. **型定義** (`types/invite.ts` - frontend & backend)
2. **バックエンド** (`tebikiInviteService.ts` → `inviteFunctions.ts`)
3. **フロントエンドサービス** (`invite.service.ts`)
4. **手引ページ** (`TebikiPage.tsx` - 静的セクション先行)
5. **招待作成UI** (TebikiPage 内の「友を誘う」セクション)
6. **招待参加ページ** (`InviteJoinPage.tsx`)
7. **ナビゲーション** (`Header.tsx` タブ追加, `App.tsx` ルート追加)
8. **Firestoreルール・インデックス** (`firestore.rules`, `firestore.indexes.json`)

## Testing

```bash
# Frontend build check
cd apps/web && npm run build

# TypeScript check
cd apps/web && npx tsc --noEmit

# Functions build
cd functions && npm run build

# Manual testing
# 1. Open /tebiki - verify 5 sections render
# 2. Login → create invite → verify link/code generated
# 3. Open invite link in incognito → verify join page
# 4. Click "参加する" → verify redirect to target mode
# 5. Test expired invite → verify fallback CTA
```

## Patterns to Follow

- **URL Parameters**: Use `URLSearchParams` (see `KeikoPage.tsx` `buildParams()`)
- **Cloud Functions**: Use `httpsCallable<Input, Output>()` (see `group.service.ts`)
- **Batch Writes**: Use `db.batch()` for atomic operations (see `groupFunctions.ts`)
- **Tab Pattern**: Follow `TabButton` in `Header.tsx`
- **UI Components**: Reuse `Card`, `Button`, `Heading`, `Text` from `@/components/ui/`
