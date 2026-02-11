---
name: admin-pipeline
description: 確定パイプライン（freeze/finalize/publish）の操作と自動処理の仕組み
---

# Admin Pipeline Skill

シーズン確定パイプラインの操作に関するスキルです。

## パイプライン状態

```
draft → frozen → finalized → published
```

| 状態 | 説明 |
|------|------|
| draft | 集計中（イベント追加可能） |
| frozen | 凍結（24時間の確認期間） |
| finalized | 確定（昇格処理完了） |
| published | 公開（immutable） |

## 自動処理

毎日 00:01 JST に `checkSeasonBoundary` が実行:

1. **シーズン終了検知** → 前シーズンを自動freeze
2. **freeze後24時間経過** → 自動finalize + publish

## 手動操作（AdminPage）

1. `/admin` にアクセス
2. 「確定パイプライン」タブを選択
3. シーズンキー（例: `2026_spring`）を選択/入力
4. Freeze / Finalize / Publish ボタンで手動実行

## 関連ファイル

### Backend
- `functions/src/scheduledFunctionsV2.ts` — 自動処理
- `functions/src/adminFunctionsV2.ts` — 手動操作API
- `functions/src/services/pipelineService.ts` — ビジネスロジック

### Frontend
- `apps/web/src/pages/AdminPage.tsx` — 管理画面
- `apps/web/src/services/admin-v2.service.ts` — API呼び出し

## トラブルシューティング

### freeze後に問題発見

24時間以内であれば手動でfinalizeを遅らせることが可能（自動処理は冪等）

### 誤ってpublishした場合

`published` 状態は `immutable: true` のため、Firestore Consoleでの直接修正が必要
