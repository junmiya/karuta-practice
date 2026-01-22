# 段階1: タスク一覧

## Phase 1: データモデル拡張

- [ ] S1_T00 Firestoreスキーマ拡張設計
  - seasons, rankings, banzukeSnapshots, dailyReflections, titles, auditLogs
  - インデックス設計

- [ ] S1_T01 seasons/{seasonId} 実装
  - open/frozen/finalized/archived の状態遷移
  - 開始日時・凍結日時・確定日時を保持

---

## Phase 2: Scheduled Functions（日次処理）

- [ ] S1_T02 generateDailyReflections 実装
  - JST境界に沿った dailyReflections 生成
  - seasonId×division×yyyymmdd で上位3セッション記録

- [ ] S1_T03 updateRankingsCache 実装
  - 暫定ランキング rankings/{seasonId}_{division} 更新
  - confirmed のみ母集団
  - tiebreak = lastReflectedSubmittedAt

---

## Phase 3: Scheduled Functions（シーズン遷移）

- [ ] S1_T04 freezeSeason 実装
  - 集計停止、frozen 状態に遷移
  - 以降の反映対象を確定時点で判定

- [ ] S1_T05 finalizeSeason 実装
  - finalized スナップショット banzukeSnapshots 作成
  - 公式結果として固定（原則再計算なし）

- [ ] S1_T06 updateTitles 実装
  - finalizedスナップショットに基づき称号カウント更新
  - 名人4回/永世8回、最低参加者24名
  - titles に履歴を残す

---

## Phase 4: フロントエンド

- [ ] S1_T07 ランキング画面の暫定/公式分離
  - 暫定（open中）: rankings 参照
  - 公式（finalized）: banzukeSnapshots 参照
  - UIで明確に区別

- [ ] S1_T08 成績画面拡張
  - 決まり字別正答率
  - 日別反映回数
  - 分散
  - 集計はキャッシュ参照でread削減

---

## Phase 5: 課金・認証

- [ ] S1_T09 課金/解約状態に応じた閲覧制御
  - 閲覧不可でもデータ保持
  - 返金なし
  - 更新日まで利用可

---

## Phase 6: 異常値判定・セキュリティ

- [ ] S1_T10 異常値判定拡張
  - ルールバージョン
  - 閾値設定
  - 無効理由コード追加
  - 運用で調整可能にする

- [ ] S1_T11 Security Rules 強化
  - サーバのみがランキング/スナップショット/称号を更新可能
  - クライアント書込領域の最小化

- [ ] S1_T12 監査ログ（auditLogs）追加
  - 確定/無効/再計算/称号付与のイベント記録
  - 重大不正時の説明可能性を担保

---

## Phase 7: コスト・運用

- [ ] S1_T13 コストガード実装
  - 読み取り制限
  - キャッシュTTL
  - 過剰アクセス対策
  - 月1万円超過リスク低減

- [ ] S1_T14 緊急時運用整備
  - 手動凍結/手動確定
  - 再計算と告知
  - 管理者専用

---

## Phase 8: UI統一・品質保証

- [ ] S1_T15 UI統一ルール仕様テスト
  - 各端末幅で12枚がスクロールなしに収まる
  - ボタン順固定
  - Tokens折返しなし
  - 最小表示モード発動条件

- [ ] S1_T16 公式競技中UIロック実装
  - ひらがな/決まり字/覚えた/シャッフルの扱い統一
  - 確認ダイアログ
  - 公平性と誤操作防止

---

## 依存関係

```
S1_T00 → S1_T01 → S1_T02, S1_T03
                → S1_T04 → S1_T05 → S1_T06
                        → S1_T07
S1_T08 (並行可)
S1_T09 (並行可)
S1_T10, S1_T11, S1_T12 (並行可)
S1_T13, S1_T14 (並行可)
S1_T15, S1_T16 (最後)
```

---

## 見積もり

| Phase | タスク数 | 備考 |
|-------|---------|------|
| Phase 1 | 2 | データモデル基盤 |
| Phase 2 | 2 | 日次処理 |
| Phase 3 | 3 | シーズン遷移（コア機能） |
| Phase 4 | 2 | フロントエンド |
| Phase 5 | 1 | 課金 |
| Phase 6 | 3 | セキュリティ |
| Phase 7 | 2 | 運用 |
| Phase 8 | 2 | 品質保証 |
| **合計** | **17** | |
