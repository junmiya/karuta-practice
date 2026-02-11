# Implementation Plan: 手引タブ（導入・遊び方・友招待）増設

**Branch**: `105-tebiki-invite` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/105-tebiki-invite/spec.md`

## Summary

初見ユーザー向け「手引」タブ（`/tebiki`）を新設し、百人一首の楽しさを30秒で伝える導入ページを提供する。加えて、ログイン済みユーザーが友人への招待リンク/コードを作成し、友人が同条件で手習・稽古・歌合を開始できる招待機能（MVP）を実装する。

既存のグループ招待パターン（inviteService.ts, crypto.ts）を踏襲し、新しい `invites` コレクションと Cloud Function で招待の作成・検証を行う。手引ページは静的コンテンツ中心で、招待セクションのみ動的。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore（新規コレクション: `invites`, 任意: `invite_participants`）
**Testing**: Vitest + React Testing Library (Frontend), 手動テスト (Functions)
**Target Platform**: Web (スマホ/タブレット/PC)
**Project Type**: Web application (monorepo: apps/web + functions)
**Performance Goals**: 手引ページは静的コンテンツ中心で即時表示。招待作成は1秒以内。
**Constraints**: Blaze無料枠内運用（月1万円以内）、Firestore読み書き最小化
**Scale/Scope**: 新規1ページ（手引）+ 1ルート（招待参加）+ Cloud Function 3本（createInvite, getInviteInfo, joinInvite）+ サービス層

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 状態 | 備考 |
| ---- | ---- | ---- |
| 原則01: 目的 | PASS | 研鑽〜公式競技の導線強化に寄与 |
| 原則03: デバイス方針 | PASS | 手引ページはレスポンシブ、札表示なし |
| 原則05: 用語統一 | PASS | yomi/tori/kimariji を踏襲 |
| 原則06: データソース | PASS | 歌データは既存の poems.seed.json を使用 |
| 原則08: Cloud Functions方針 | PASS | 招待作成・参加はCallable Function（段階0の1本制限は段階1で緩和済み） |
| 原則13: コスト方針 | PASS | 招待作成時のみFirestore書込み、静的ページ主体 |
| 原則20: タブ構成 | DEVIATION | 憲法は4タブ（学習/研鑽/競技/成績）だが、既に5タブ（手習/稽古/歌合/結び/歌位）に拡張済み。手引追加で6タブとなる。specで明示されたタブ順序に従う |
| 原則21: アクセス方針 | PASS | 手引ページはログイン不要（学習と同様） |
| 原則24: デザイン参照 | PASS | 簡潔・余白・タイポ中心の方針に沿ったレイアウト |
| 原則25: コンポーネント共通化 | PASS | 既存のCard, Button, Heading, Text UIコンポーネントを再利用 |

## Project Structure

### Documentation (this feature)

```text
specs/105-tebiki-invite/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── invite-api.yaml  # Invite Cloud Functions API contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── components/
│   └── Header.tsx              # 手引タブ追加（既存修正）
├── pages/
│   ├── TebikiPage.tsx          # 手引ページ（新規）
│   └── InviteJoinPage.tsx      # 招待参加ページ（新規）
├── services/
│   └── invite.service.ts       # 招待サービス（新規）
├── types/
│   └── invite.ts               # 招待型定義（新規）
└── App.tsx                     # ルート追加（既存修正）

functions/src/
├── inviteFunctions.ts          # 招待Cloud Functions（新規）
├── services/
│   └── tebikiInviteService.ts  # 招待ビジネスロジック（新規）
└── types/
    └── invite.ts               # バックエンド招待型定義（新規）
```

**Structure Decision**: 既存のWeb app monorepo構造（apps/web + functions）を踏襲。新規ファイルはフロントエンドに3ファイル（ページ2 + サービス1 + 型1）、バックエンドに3ファイル（関数1 + サービス1 + 型1）、既存修正は2ファイル（Header.tsx, App.tsx）。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 6タブ（原則20の4タブから拡張） | specで明示的に指定されたタブ順序（手引・手習・稽古・歌合・結び・歌位）。既に結び追加で5タブに拡張済み | 既存のタブを統合すると既存ユーザーの導線が壊れる |
