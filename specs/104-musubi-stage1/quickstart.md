# Quickstart: 結び（段階1：結び＋集い）

**Branch**: `104-musubi-stage1` | **Date**: 2026-02-07

## Prerequisites

- Node.js 20+
- Firebase CLI (`firebase-tools`)
- Access to `karuta-banzuke` Firebase project

## Setup

```bash
# Clone and checkout
git checkout 104-musubi-stage1

# Install dependencies
cd apps/web && npm install
cd ../../functions && npm install
```

## Development

```bash
# Frontend dev server
cd apps/web && npm run dev

# Backend build (TypeScript → JavaScript)
cd functions && npm run build
```

## Key Files to Modify

### Frontend (apps/web/src/)

1. **components/Header.tsx** — 結びタブ追加（歌合と歌位の間）
2. **App.tsx** — `/musubi/join` ルート追加
3. **pages/GroupHomePage.tsx** — 二分割レイアウト
4. **pages/GroupEventPage.tsx** — 公開/却下/終了UIボタン
5. **pages/GroupListPage.tsx** — 用語統一（結び）
6. **pages/GroupCreatePage.tsx** — 用語統一（結び）
7. **types/group.ts** — EventStatus に `rejected` 追加

### Backend (functions/src/)

1. **groupFunctions.ts** — `rejectEvent` 関数追加
2. **types/group.ts** — EventStatus に `rejected` 追加
3. **services/groupAuditService.ts** — `logEventReject` 追加
4. **index.ts** — `rejectEvent` をエクスポート

## Deployment

```bash
# Functions deploy
cd functions && npm run build && firebase deploy --only functions --project karuta-banzuke

# Frontend deploy
cd apps/web && npm run build && firebase deploy --only hosting --project karuta-banzuke

# Firestore rules (変更不要 - 既存ルールで対応済み)
```

## Testing Checklist

1. [ ] 5タブ表示（手習/稽古/歌合/結び/歌位）
2. [ ] 結び作成 → ホーム表示
3. [ ] ホームに「集い」「団体歌合（準備中）」の2セクション
4. [ ] 招待コード入力で参加
5. [ ] QRディープリンクで参加（`/musubi/join?groupId=X&code=Y`）
6. [ ] 集い作成（draft）→ 公開（published）→ 終了（closed）
7. [ ] 主宰者による集い却下（rejected）
8. [ ] draft/rejected の集いが一般メンバーに非表示
9. [ ] 用語がすべて「結び」「集い」に統一
10. [ ] sessions/rankings/events コレクションに変更がないこと
