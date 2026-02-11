---
name: phase2-sekki-ranking
description: Phase 2（102-utaawase-sekki-ranking）節気別歌位確定の実装ガイド。現在進行中のフェーズ
---

# Phase 2: 節気別歌位確定 Skill

現在進行中のPhase 2実装ガイドです。

## 概要

四季（春・夏・秋・冬）ごとにシーズンを区切り、歌位（級位・段位・伝位）を確定するシステム。

## 仕様書

**基本:** `specs/102-utaawase-sekki-ranking/spec.md`
**データ:** `specs/102-utaawase-sekki-ranking/data-model.md`
**API:** `specs/102-utaawase-sekki-ranking/contracts/callable-functions.md`

---

## 主要機能

### 1. 節気カレンダー

年間の四季期間を定義:

| シーズン | 期間（2026年例） |
|---------|-----------------|
| 春戦 | 2/4 立春 〜 5/5 立夏 |
| 夏戦 | 5/5 立夏 〜 8/7 立秋 |
| 秋戦 | 8/7 立秋 〜 11/7 立冬 |
| 冬戦 | 11/7 立冬 〜 翌2/3 立春 |

**関連ファイル:**
- `functions/src/services/seasonCalendarService.ts`
- `functions/src/adminFunctionsV2.ts` (adminGetSeasonCalendar, adminSeedDefaultCalendar)

---

### 2. ルールセット

昇格条件を定義:

- **級位（kyui）**: 決まり字テスト合格
- **段位（dan）**: シーズン順位上位%
- **伝位（den）**: 公式戦優勝回数
- **歌位（utakurai）**: 名人・永世名人

**関連ファイル:**
- `functions/src/services/rulesetService.ts`
- `functions/src/types/utaawase.ts` (Ruleset型)

---

### 3. 確定パイプライン

```
draft → frozen → finalized → published
```

| ステップ | 処理内容 |
|---------|---------|
| freeze | イベント集計停止、ランキング確定 |
| finalize | 昇格判定実行 |
| publish | 結果公開、immutable化 |

**関連ファイル:**
- `functions/src/services/pipelineService.ts`
- `functions/src/scheduledFunctionsV2.ts` (自動処理)

---

## 実装状態

- [x] 節気カレンダー管理
- [x] ルールセット管理
- [x] 確定パイプライン（手動操作）
- [x] 自動処理スケジュール
- [x] AdminPage UI
- [ ] 昇格結果通知
- [ ] ユーザー向け歌位表示

---

## 開発時の注意

1. **冪等性**: パイプライン各ステップは冪等に実装
2. **状態機械**: 正しい順序でのみ遷移可能
3. **監査ログ**: 管理者操作は全てログ記録
