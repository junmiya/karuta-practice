# Implementation Plan: 団体機能（団体戦＋団体内イベント）

**Branch**: `103-group-feature` | **Date**: 2026-02-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/103-group-feature/spec.md`

## Summary

団体を「団体戦」と「団体内イベント」の共通コンテナとして実装。招待コード（ハッシュ保存）によるメンバー参加管理、3段階のロール権限（owner/organizer/member）、競技の団体紐づけ（開始時凍結）、個人/団体成績の整合的な集計を提供する。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 18+ Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore (5 new collections: groups, group_memberships, group_invites, group_events, + matches拡張)
**Testing**: Vitest (Frontend), Jest (Functions)
**Target Platform**: Web (PWA対応)
**Project Type**: web (apps/web + functions)
**Performance Goals**: 招待コード検証 < 500ms, 団体一覧表示 < 1s
**Constraints**: Firebase無料枠内（月1万円まで許容）、招待コード平文保存禁止
**Scale/Scope**: 初期: 100団体/1000ユーザー規模を想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 対応 |
|------|------|------|
| 原則07: 公式性の定義 | ✅ PASS | 団体内イベント(isOfficial=false)は公式集計から除外。団体戦の公式記録はサーバ側で検証・確定 |
| 原則08: Cloud Functions方針 | ✅ PASS | 新規Callable Functions追加（団体参加、ロール変更など）。段階0の`submitOfficialSession`は維持 |
| 原則11: プライバシー方針 | ✅ PASS | 団体内でも表示名（ニックネーム）のみ公開 |
| 原則13: コスト方針 | ✅ PASS | Firestore書き込みを抑える設計（招待コード検証はハッシュ比較のみ） |
| 原則20: タブ構成 | ⚠️ 要検討 | 「団体」タブ新設は原則の4タブ構成（学習/研鑽/競技/成績）から逸脱。サブナビとして実装し、メインタブ構成は維持 |
| 原則21: アクセス方針 | ✅ PASS | 団体機能はログイン必須 |
| 原則23: サーバ権限 | ✅ PASS | 団体の公式判定、成績確定、ロール変更はサーバのみ実行 |

**Constitution Violation Justification**: 原則20について、団体機能はプロフィールタブ内のサブセクションとして実装し、メインタブ構成（手習/稽古/歌合/歌位）を維持する。

## Project Structure

### Documentation (this feature)

```text
specs/103-group-feature/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── group-api.yaml   # 団体管理API
│   └── invite-api.yaml  # 招待コードAPI
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (existing)
apps/web/
├── src/
│   ├── components/
│   │   └── group/           # 新規: 団体関連コンポーネント
│   │       ├── GroupCard.tsx
│   │       ├── GroupList.tsx
│   │       ├── InviteCodeDisplay.tsx
│   │       ├── MemberList.tsx
│   │       └── QRCodeModal.tsx
│   ├── pages/
│   │   ├── GroupListPage.tsx    # 新規: 団体一覧
│   │   ├── GroupCreatePage.tsx  # 新規: 団体作成
│   │   ├── GroupHomePage.tsx    # 新規: 団体トップ
│   │   ├── GroupJoinPage.tsx    # 新規: 団体参加
│   │   ├── GroupEventPage.tsx   # 新規: イベント管理
│   │   └── GroupMatchPage.tsx   # 新規: 団体戦
│   ├── services/
│   │   └── group.service.ts     # 新規: 団体関連サービス
│   ├── hooks/
│   │   ├── useGroup.ts          # 新規: 団体フック
│   │   └── useGroupMembership.ts
│   └── types/
│       └── group.ts             # 新規: 団体関連型定義
└── tests/

functions/
├── src/
│   ├── groupFunctions.ts        # 新規: 団体Callable Functions
│   ├── services/
│   │   ├── groupService.ts      # 新規: 団体サービス
│   │   ├── inviteService.ts     # 新規: 招待コードサービス
│   │   └── groupStatsService.ts # 新規: 団体成績集計
│   └── types/
│       └── group.ts             # 新規: 団体関連型定義
└── lib/
    └── crypto.ts                # 新規: 招待コードハッシュユーティリティ
```

**Structure Decision**: 既存のmonorepo構成（apps/web + functions）を維持し、団体機能用のコンポーネント・サービス・型定義を追加。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 団体タブ新設 | 団体戦/イベントの導線として必要 | プロフィールタブ内サブセクションとして実装し、メインタブ構成は維持 |
| 5コレクション追加 | 団体/メンバーシップ/招待/イベント/成績を分離管理 | 単一コレクションでは権限分離・クエリ効率が悪化 |
