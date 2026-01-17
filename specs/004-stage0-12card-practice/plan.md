# Implementation Plan: 段階0 12枚固定練習UI・公式競技・番付

**Branch**: `004-stage0-12card-practice` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-stage0-12card-practice/spec.md`

## Summary

段階0の完成に向けて、以下の機能を実装する：

1. **12枚固定の練習UI**: 4×3グリッドで札を表示し、ひらがな切替・決まり字フィルタ・シャッフル機能を提供
2. **公式競技（50問）**: エントリー済みユーザーがセッションを開始し、サーバーで検証・確定
3. **公式番付**: シーズン×部門ごとのランキング表示

技術的には、既存のVite + React + TypeScript構成を拡張し、Cloud Functions Callable（submitOfficialSession）を1本追加する。

## Technical Context

**Language/Version**: TypeScript 5.x（Frontend: Vite + React 18、Backend: Node.js 18+ for Cloud Functions）
**Primary Dependencies**: React 18, React Router 6, Firebase SDK 10, Tailwind CSS 3
**Storage**: Firebase Firestore（sessions, entries, rankings, userStats コレクション）
**Testing**: Vitest（Frontend）、Firebase Emulator Suite（統合テスト）
**Target Platform**: Web（レスポンシブ：スマホ/タブレット/PC）
**Project Type**: Web application（フロントエンド + Firebase Backend）
**Performance Goals**: 番付反映30秒以内、ページ表示3秒以内、同時接続100ユーザー
**Constraints**: 月額コスト1万円以内、Blaze無料枠内運用を目指す
**Scale/Scope**: 初期100ユーザー規模、100首の歌データ

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 要件 | 準拠状況 |
|------|------|----------|
| 原則02: 段階0スコープ | 12枚UI、50問競技、番付 | ✅ 全て含む |
| 原則03: デバイス・UI方針 | 12枚固定、4×3グリッド | ✅ 準拠 |
| 原則04: 札の縦横比 | 73:52維持 | ✅ CSS aspect-ratio使用 |
| 原則07: 公式性の定義 | サーバー検証・確定 | ✅ Callable Function使用 |
| 原則08: Cloud Functions方針 | Callable 1本のみ | ✅ submitOfficialSessionのみ |
| 原則09: シーズン方針 | 年4回、seasonId形式 | ✅ YYYY_{season}形式 |
| 原則10: 部門・エントリー方針 | 級位/段位、六級制限 | ✅ エントリー検証で対応 |
| 原則11: 番付・プライバシー方針 | confirmed のみ、ニックネーム | ✅ 準拠 |
| 原則12: 日付境界 | JST 00:00〜23:59 | ✅ サーバーで算出 |
| 原則13: コスト方針 | 月1万円以内 | ✅ 設計で考慮 |

**Result**: 全原則に準拠。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/004-stage0-12card-practice/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── callable-functions.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── KarutaCard.tsx       # 札コンポーネント（73:52比率）
│   │   ├── KarutaGrid.tsx       # 4×3グリッド
│   │   ├── PracticeControls.tsx # ひらがな・決まり字・シャッフルボタン
│   │   └── RankingList.tsx      # 番付表示
│   ├── pages/
│   │   ├── PracticePage.tsx     # 練習ページ（12枚UI）
│   │   ├── OfficialPage.tsx     # 公式競技ページ
│   │   ├── EntryPage.tsx        # エントリーページ
│   │   └── BanzukePage.tsx      # 番付ページ
│   ├── services/
│   │   ├── poems.service.ts     # 歌データ管理
│   │   ├── session.service.ts   # セッション管理
│   │   ├── entry.service.ts     # エントリー管理
│   │   └── ranking.service.ts   # 番付取得
│   ├── hooks/
│   │   ├── usePractice.ts       # 練習状態管理
│   │   ├── useOfficialSession.ts # 公式競技状態管理
│   │   └── useRanking.ts        # 番付データ取得
│   └── types/
│       ├── poem.ts
│       ├── session.ts
│       ├── entry.ts
│       └── ranking.ts
└── tests/
    └── (Vitest tests)

functions/
├── src/
│   ├── index.ts                 # Cloud Functions エントリポイント
│   ├── submitOfficialSession.ts # Callable Function
│   ├── validators/
│   │   └── sessionValidator.ts  # 異常値検出
│   └── services/
│       ├── scoreCalculator.ts   # スコア計算
│       └── rankingUpdater.ts    # 番付更新
└── tests/
```

**Structure Decision**: 既存の`apps/web/`構成を拡張し、`functions/`ディレクトリを追加してCloud Functionsを配置する。

## Complexity Tracking

違反なし。Complexity Trackingは不要。
