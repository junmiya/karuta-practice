# Implementation Plan: 百人一首競技カルタアプリ完全仕様

**Branch**: `101-karuta-app-spec` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/101-karuta-app-spec/spec.md`

## Summary

百人一首・競技カルタの学習〜公式競技（番付）までを提供するWebアプリケーション。
段階0では「12枚固定UI」「共通ボタン群」「公式競技50問」「Callableで確定」「公式番付」「成績タブ番付表示」を本番相当で動作させる。
段階1では「運用が人手なしで回る」状態を実現する。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 18+ for Cloud Functions)
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK (Functions)
**Storage**: Firebase Firestore (NoSQL document database)
**Testing**: Vitest (frontend), Firebase Emulator Suite (integration)
**Target Platform**: Web (SPA) - Mobile-first responsive design, Firebase Hosting
**Project Type**: Web application (frontend + serverless backend)
**Performance Goals**:
- 札一覧表示 < 3秒
- クイズ判定 < 100ms
- 公式セッション確定 < 10秒
- 番付表示 < 2秒
**Constraints**:
- 月額コスト上限 1万円
- Firestore read/write最適化必須
- キャッシュ参照中心のアーキテクチャ
**Scale/Scope**:
- 100首の札データ
- シーズン参加者 ~100名想定
- 4タブ構成（学習・研鑽・競技・成績）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 要件 | 適合状況 |
|------|------|----------|
| 原則01: 目的 | 競技カルタの研鑽〜公式競技（番付）を提供 | ✅ 適合 |
| 原則02: 段階0スコープ | 公式競技50問、公式番付、12枚固定UI | ✅ 適合 |
| 原則03: デバイス方針 | 全モード12枚固定 | ✅ 適合 |
| 原則04: 札の縦横比 | 73:52固定 | ✅ 適合（FR-006） |
| 原則05: 用語統一 | yomi/tori/kimariji/kimarijiCount | ✅ 適合 |
| 原則06: データソース | poems.seed.jsonクライアント同梱 | ✅ 適合 |
| 原則07: 公式性の定義 | サーバ検証・確定のみ公式 | ✅ 適合（FR-025） |
| 原則08: Cloud Functions方針 | Callable 1本（submitOfficialSession） | ✅ 適合 |
| 原則09: シーズン方針 | 年4回、YYYY_{season}形式 | ✅ 適合（FR-037, FR-038） |
| 原則10: 部門・エントリー方針 | 級位/段位の部、単一エントリー | ✅ 適合（FR-032〜FR-036） |
| 原則11: 番付・プライバシー | ニックネームのみ、同意必須 | ✅ 適合（FR-030, FR-035） |
| 原則12: 日付境界 | JST 00:00〜23:59 | ✅ 適合 |
| 原則13: コスト方針 | 月1万円上限 | ✅ 適合（キャッシュ戦略） |
| 原則20: タブ構成 | 学習/研鑽/競技/成績 | ✅ 適合（FR-001） |
| 原則21: アクセス方針 | 学習=ゲストOK、他=ログイン必須 | ✅ 適合（FR-002, FR-003） |
| 原則22: グリッド方針 | 4×3/3×4自動切替 | ✅ 適合（FR-005） |
| 原則23: サーバ権限 | 公式領域はサーバのみ更新 | ✅ 適合（FR-025） |
| 原則24: デザイン参照 | 簡潔・余白・タイポ中心 | ✅ 適合（design_rules） |
| 原則25: コンポーネント共通化 | 全タブで同一部品再利用 | ✅ 適合（ui_architecture） |

**Gate Result**: ✅ PASS - 全原則に適合

## Project Structure

### Documentation (this feature)

```text
specs/101-karuta-app-spec/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── submitOfficialSession.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/
└── web/                           # Frontend (Vite + React + TypeScript)
    ├── src/
    │   ├── components/            # 共通UIコンポーネント
    │   │   ├── AppShell.tsx       # Header + TabNav + Content
    │   │   ├── TabNav.tsx         # 学習/研鑽/競技/成績
    │   │   ├── ControlBar.tsx     # ひらがな/決まり字/覚えた/シャッフル
    │   │   ├── CardGrid.tsx       # 12枚グリッド（4×3/3×4）
    │   │   ├── PoemCard.tsx       # 札（73:52比率）
    │   │   ├── Button.tsx         # 共通ボタン
    │   │   ├── Card.tsx           # 汎用カード
    │   │   ├── KimarijiSelector.tsx # 決まり字選択
    │   │   └── StateViews.tsx     # loading/empty/error
    │   ├── pages/                 # ルートページ
    │   │   ├── HomePage.tsx       # 学習タブ（札一覧）
    │   │   ├── KensanPage.tsx     # 研鑽タブ（クイズ練習）
    │   │   ├── KyogiPage.tsx      # 競技タブ（公式競技）
    │   │   ├── SeisekiPage.tsx    # 成績タブ（個人成績・番付）
    │   │   ├── EntryPage.tsx      # エントリー画面
    │   │   └── ProfilePage.tsx    # プロフィール設定
    │   ├── hooks/                 # カスタムフック
    │   │   ├── usePractice.ts     # 練習ロジック
    │   │   ├── useOfficialSession.ts # 公式セッション管理
    │   │   └── usePoems.ts        # 札データ管理
    │   ├── contexts/              # React Context
    │   │   └── AuthContext.tsx    # 認証状態管理
    │   ├── services/              # Firebase連携
    │   │   ├── firebase.ts        # Firebase初期化
    │   │   ├── auth.ts            # 認証サービス
    │   │   └── firestore.ts       # Firestore操作
    │   ├── types/                 # TypeScript型定義
    │   │   ├── poem.ts
    │   │   ├── session.ts
    │   │   └── ranking.ts
    │   ├── utils/                 # ユーティリティ
    │   │   └── karuta.ts          # 札関連ヘルパー
    │   └── data/                  # 静的データ
    │       └── poems.seed.json    # 100首データ
    └── public/

functions/                         # Cloud Functions (Node.js)
├── src/
│   ├── index.ts                   # エントリポイント
│   ├── submitOfficialSession.ts   # Callable Function（公式セッション確定）
│   ├── updateRankingsCache.ts     # Scheduled Function（番付キャッシュ更新）
│   ├── validators/                # 検証ロジック
│   │   └── sessionValidator.ts    # 異常検知
│   └── utils/                     # ユーティリティ
│       └── scoring.ts             # スコア計算
└── package.json

data/                              # シードデータ
└── poems.seed.json                # 100首データ（マスター）

firestore.rules                    # Security Rules
firestore.indexes.json             # インデックス定義
```

**Structure Decision**: Web application構成。フロントエンドはVite + React、バックエンドはFirebase Cloud Functions（Callable 1本 + Scheduled Functions）。既存のapps/web構造を継続使用。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| なし | - | - |

全原則に適合しており、複雑性の正当化は不要。
