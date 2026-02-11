# Implementation Plan: 歌合・節気別歌位確定システム

**Branch**: `102-utaawase-sekki-ranking` | **Date**: 2026-01-27 | **Spec**: `specs/102-utaawase-sekki-ranking/spec.md`
**Input**: Feature specification from `/specs/102-utaawase-sekki-ranking/spec.md`

## Summary

既存のseason/entry/ranking/banzukeシステムを二十四節気ベースの歌合・歌位システムに完全置き換えする。ルールセット（Firestoreドキュメント）と節気カレンダー（JSON）を設定データとし、級位検定（即時昇級）・段位/伝位/歌位（季末確定）の昇格パイプラインを実装する。スコア集計はベスト3回合計方式。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 18+ Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore (6 new collections: rulesets, season_calendars, events, user_progress, season_snapshots, job_runs)
**Testing**: vitest (frontend), jest (functions unit tests)
**Target Platform**: Web SPA (Firebase Hosting)
**Project Type**: web (frontend + backend)
**Performance Goals**: 級位検定の合格判定は3秒以内 (SC-001), パイプライン各段階は1操作で実行 (SC-003)
**Constraints**: コスト月1万円以内 (原則13), サーバ権限で全公式操作 (原則23)
**Scale/Scope**: 既存ユーザーベース, 6新規Firestoreコレクション, 級位6段階・段位6段階・伝位4段階・歌位2段階

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| 原則01: 目的 | ✅ | 百人一首・競技カルタの研鑽〜公式競技の提供に合致 |
| 原則07: 公式性 | ✅ | 全昇格・スナップショットはサーバのみが実行 |
| 原則09: シーズン方針 | ✅ | 年4回、`YYYY_{spring\|summer\|autumn\|winter}` 形式維持 |
| 原則10: 部門方針 | ✅ | 級位の部/段位の部、六級保有で段位の部参加可能 |
| 原則13: コスト方針 | ✅ | Minimal writes、既存パターン再利用 |
| 原則15: シーズン状態遷移 | ✅ | draft→frozen→finalized→published (open→frozen→finalized→archivedの拡張) |
| 原則22: グリッド方針 | ✅ | 12枚固定UI変更なし |
| 原則23: サーバ権限 | ✅ | Security Rulesで全新規コレクションのクライアント書込禁止 |

## Project Structure

### Documentation (this feature)

```text
specs/102-utaawase-sekki-ranking/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── callable-functions-v2.md
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
functions/src/
├── types/
│   └── utaawase.ts          # 全新規型定義
├── lib/
│   └── ruleEngine.ts        # 純関数ルールエンジン
├── services/
│   ├── rulesetService.ts        # ルールセットCRUD
│   ├── seasonCalendarService.ts # 節気カレンダーCRUD
│   ├── eventService.ts          # イベント管理
│   ├── userProgressService.ts   # ユーザー進捗管理
│   ├── pipelineService.ts       # freeze/finalize/publish
│   └── promotionService.ts     # 昇格判定
├── adminFunctionsV2.ts      # 管理者callable
├── kyuiExamFunction.ts      # 級位検定callable
├── scheduledFunctionsV2.ts  # 節気境界チェック
├── __tests__/
│   ├── ruleEngine.test.ts
│   ├── pipelineService.test.ts
│   └── eventService.test.ts
└── index.ts                 # エクスポート追加

apps/web/src/
├── types/
│   └── utaawase.ts          # Frontend型ミラー
├── services/
│   ├── admin-v2.service.ts  # 管理者V2 service
│   ├── kyuiExam.service.ts  # 検定service
│   └── utaawase.service.ts  # 歌位データservice
├── hooks/
│   └── useKyuiExam.ts       # 検定hook
├── pages/
│   ├── KyuiExamPage.tsx     # 検定ページ
│   ├── AdminPage.tsx        # タブ追加（節気/ルール/パイプライン）
│   └── BanzukePage.tsx      # 歌位ビューモード追加
└── App.tsx                  # /kyui-exam ルート追加
```

**Structure Decision**: 既存のfunctions/src + apps/web/src構造を維持。新規ファイルは既存ディレクトリ内に配置し、index.tsにエクスポートを追加する方式。

## Complexity Tracking

該当なし（Constitution Check全項目パス）
