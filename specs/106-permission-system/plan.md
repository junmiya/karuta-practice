# Implementation Plan: 権限システム整理

**Branch**: `106-permission-system` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/106-permission-system/spec.md`

## Summary

管理者権限を環境変数（`ADMIN_UIDS`）ベースから Firestore `siteRole` ベースに移行し、テスター権限の管理を可能にする。フロントエンドに admin ガードを追加し、管理ダッシュボードに「ユーザー管理」タブを新設する。

既存の `adminFunctionsV2.ts` のローカル `isAdmin` / `requireAdmin` を共通ユーティリティに集約。V1（`adminFunctions.ts`）は未使用のため削除。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore（既存 `users` コレクションに `siteRole` フィールド追加）
**Testing**: Vitest (Functions unit tests), 手動テスト (Frontend)
**Target Platform**: Web (スマホ/タブレット/PC)
**Project Type**: Web application (monorepo: apps/web + functions)
**Constraints**: 既存の管理ダッシュボード機能に影響を与えない移行

## Constitution Check

| 原則 | 状態 | 備考 |
| ---- | ---- | ---- |
| 原則08: Cloud Functions方針 | PASS | 権限変更はCallable Function経由 |
| 原則13: コスト方針 | PASS | 追加Firestore読取は `getSiteRole` のみ（管理操作時） |
| 原則21: アクセス方針 | PASS | 管理ダッシュボードはadminのみ、ベータ機能はtester+admin |

## Project Structure

### Documentation (this feature)

```text
specs/106-permission-system/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── components/
│   └── AdminRoute.tsx          # 管理者ガードコンポーネント（新規）
├── contexts/
│   └── AuthContext.tsx          # siteRole 追加（既存修正）
├── hooks/
│   └── useAuth.ts              # siteRole / isAdmin / isTester 追加（既存修正）
├── pages/
│   └── AdminPage.tsx           # ユーザー管理タブ追加（既存修正）
├── services/
│   ├── admin-v2.service.ts     # adminGetUsers/adminSetUserRole ラッパー追加（既存修正）
│   └── users.service.ts        # siteRole 読み取り対応（既存修正）
├── types/
│   └── user.ts                 # SiteRole 型 + siteRole フィールド追加（既存修正）
└── App.tsx                     # AdminRoute ガード適用（既存修正）

functions/src/
├── lib/
│   └── adminAuth.ts            # isAdmin / requireAdmin 共通ユーティリティ（新規）
├── adminFunctionsV2.ts         # ローカル isAdmin 削除 → 共通ユーティリティに切替（既存修正）
├── adminFunctions.ts           # 削除
└── index.ts                    # adminGetUsers / adminSetUserRole export追加（既存修正）
```

**Structure Decision**: 新規ファイルは2ファイル（`AdminRoute.tsx`, `lib/adminAuth.ts`）のみ。残りは既存ファイルの修正。V1は削除。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `requireAdmin` の非同期化 | Firestore読み取りが必要なため避けられない | 同期のままでは `siteRole` を参照できない |
| 移行期間の二重チェック | 安全な段階的移行のため | 環境変数を即時廃止するとデプロイ順序ミスで管理権限喪失リスク |
