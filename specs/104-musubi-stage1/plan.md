# Implementation Plan: 結び（段階1：結び＋集い）

**Branch**: `104-musubi-stage1` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/104-musubi-stage1/spec.md`

## Summary

結び（団体）機能の段階1として、5タブ構成への移行、結びホームの二分割表示（集い/団体歌合[準備中]）、集いの状態遷移UI（draft/published/rejected/closed）を実装する。バックエンド（Cloud Functions・Firestoreサービス）は103-group-featureで90%以上完成済みのため、**主な作業はフロントエンドUI改修とイベントリジェクト機能の追加**に限定される。成績/ランキング/歌位ロジックには一切触れない。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore (NoSQL) — 既存コレクション: groups, group_memberships, group_invites, group_events, group_event_participants, group_stats
**Testing**: Vite test / manual E2E（既存プロジェクトのテスト方針に準拠）
**Target Platform**: Web (SPA, Firebase Hosting)
**Project Type**: Web application (frontend + backend Cloud Functions)
**Performance Goals**: 標準的なWebアプリ応答（ページ遷移<1s、API呼び出し<3s）
**Constraints**: Firestore無料枠内運用（月1万円以内）、クライアント直書き禁止
**Scale/Scope**: 現在3ユーザー、段階1では数十名を想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | Status | Notes |
|------|--------|-------|
| 原則01: 目的 | PASS | 結び機能は「研鑽〜公式競技」の共同体基盤を提供 |
| 原則07: 公式性の定義 | PASS | 段階1ではsessions/rankingsに一切触れない |
| 原則13: コスト方針 | PASS | 新コレクション追加なし、既存構造を再利用 |
| 原則20: タブ構成 | **VIOLATION** | 4タブ→5タブへ変更（下記Complexity Trackingで正当化） |
| 原則21: アクセス方針 | PASS | 結びタブはログイン必須（既存方針に準拠） |
| 原則23: サーバ権限 | PASS | すべての書き込みはCloud Functions経由 |
| 原則25: コンポーネント共通化 | PASS | 既存Card/Badge/Buttonコンポーネントを再利用 |

## Project Structure

### Documentation (this feature)

```text
specs/104-musubi-stage1/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── callable-functions.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/web/src/
├── components/
│   └── Header.tsx              # [MODIFY] 5タブ構成へ
├── pages/
│   ├── GroupHomePage.tsx        # [MODIFY] 二分割レイアウト（集い/団体歌合）
│   ├── GroupEventPage.tsx       # [MODIFY] 公開/却下/終了UIボタン追加
│   ├── GroupListPage.tsx        # [MINOR] 用語「結び」統一
│   ├── GroupCreatePage.tsx      # [MINOR] 用語「結び」統一
│   ├── GroupJoinPage.tsx        # [OK] QRディープリンク対応済み
│   ├── GroupEditPage.tsx        # [OK] 段階1スコープ外（編集は段階2）
│   └── GroupMembersPage.tsx     # [OK] 既存で完成
├── services/
│   └── group.service.ts        # [MINOR] rejectEvent追加
├── types/
│   └── group.ts                # [MODIFY] EventStatusにrejected追加
├── hooks/
│   ├── useGroup.ts             # [OK] 既存で完成
│   └── useGroupMembership.ts   # [OK] 既存で完成
└── App.tsx                     # [MODIFY] ルートにmusubiパス追加

functions/src/
├── groupFunctions.ts           # [MODIFY] rejectEvent関数追加
├── types/
│   └── group.ts                # [MODIFY] EventStatusにrejected追加
└── services/
    ├── groupService.ts         # [OK] 既存で完成
    ├── inviteService.ts        # [OK] 既存で完成（コード16文字以上確認要）
    ├── groupAuditService.ts    # [MODIFY] logEventReject追加
    └── groupStatsService.ts    # [OK] 段階1では使用しない
```

**Structure Decision**: 既存のWeb application構造（apps/web + functions）をそのまま使用。新規ファイル作成は不要。既存ファイルの修正のみ。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 原則20: 4タブ→5タブ | 結び（団体）機能は既存4タブのどこにも自然に収まらない。独立したナビゲーション導線が必要 | 歌合タブ内にサブメニューとして配置する案は、結びが歌合とは独立した機能であるため不適切。ユーザーが結びを見つけにくくなる |

## Implementation Strategy

### 既存実装の活用（103-group-featureから）

103-group-featureで以下が**完成済み**:
- Cloud Functions: 26+の callable関数（グループCRUD、招待、メンバー管理、イベント管理）
- Firestoreサービス: groupService, inviteService, groupAuditService
- フロントエンドサービス: group.service.ts（全API呼び出し）
- フロントエンドフック: useGroup, useGroupMembership（全CRUD操作）
- フロントエンドページ: 7ページ（リスト、作成、ホーム、参加、編集、メンバー、イベント）
- QRコード表示: QRCodeModalコンポーネント
- ディープリンク: GroupJoinPageがURLパラメータ対応済み

### 段階1で必要な変更

1. **Header.tsx**: 結びタブ追加（歌合と歌位の間）
2. **App.tsx**: `/musubi/join` ルート追加（QRディープリンク用）
3. **GroupHomePage.tsx**: 二分割レイアウト（集い/団体歌合[準備中]）
4. **GroupEventPage.tsx**: 公開・却下・終了のUIボタン追加
5. **group.ts（両方）**: EventStatusに`rejected`追加
6. **groupFunctions.ts**: rejectEvent関数追加
7. **groupAuditService.ts**: logEventReject追加
8. **UI用語統一**: 「団体」→「結び」、「イベント」→「集い」

### 変更しないもの（段階1スコープ外の確認）

- sessions コレクション: 変更なし
- events コレクション: 変更なし
- rankings コレクション: 変更なし
- submitOfficialSession: 変更なし
- updateRanking: 変更なし
- userProgressService: 変更なし
- 結びプロフィール編集: 段階2に先送り
