# 段階1: 実装計画

## ゴール

段階1で「運用が人手なしで回る」状態にする：
- シーズン開始/凍結/確定/公開
- 番付更新
- 称号付与

---

## データモデル拡張

Firestoreに以下を追加：

### 新規コレクション

| コレクション | 用途 |
|--------------|------|
| `seasons/{seasonId}` | シーズン管理（状態遷移） |
| `rankings/{seasonId}_{division}` | 暫定ランキングキャッシュ |
| `banzukeSnapshots/{seasonId}_{division}` | 確定番付スナップショット |
| `dailyReflections/{seasonId}_{division}_{yyyymmdd}` | 日次反映記録 |
| `titles/{uid}` | 称号履歴 |
| `auditLogs/{eventId}` | 監査ログ |

### seasons/{seasonId} スキーマ

```typescript
{
  seasonId: string;          // "2026_spring"
  name: string;              // "2026年春場所"
  status: "open" | "frozen" | "finalized" | "archived";
  startDate: timestamp;
  freezeDate: timestamp;
  finalizeDate: timestamp;
  archiveDate: timestamp;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### banzukeSnapshots/{seasonId}_{division} スキーマ

```typescript
{
  seasonId: string;
  division: "kyu" | "dan";
  status: "finalized";
  entries: Array<{
    uid: string;
    nickname: string;
    rank: number;
    score: number;
    sessionCount: number;
    lastReflectedSubmittedAt: timestamp;
  }>;
  totalParticipants: number;
  createdAt: timestamp;
}
```

### dailyReflections/{seasonId}_{division}_{yyyymmdd} スキーマ

```typescript
{
  seasonId: string;
  division: "kyu" | "dan";
  dayKeyJst: string;         // "2026-01-18"
  topSessions: Array<{       // 上位3セッション
    sessionId: string;
    uid: string;
    score: number;
    submittedAt: timestamp;
  }>;
  createdAt: timestamp;
}
```

### titles/{uid} スキーマ

```typescript
{
  uid: string;
  meijinCount: number;       // 名人回数
  eiseiCount: number;        // 永世回数
  history: Array<{
    seasonId: string;
    rank: number;
    awardedAt: timestamp;
  }>;
  updatedAt: timestamp;
}
```

---

## Scheduled Functions

| 関数 | スケジュール | 処理内容 |
|------|-------------|----------|
| `generateDailyReflections` | 毎日 00:05 JST | dailyReflections生成（上位3セッション） |
| `updateRankingsCache` | 5〜15分おき | 暫定ランキング更新 |
| `freezeSeason` | シーズン境界 | frozen状態に遷移 |
| `finalizeSeason` | frozen後24時間 | banzukeSnapshots作成、finalized |
| `updateTitles` | finalize後 | 称号カウント更新 |

---

## Callable Functions

### submitOfficialSession（継続）

- 段階0から継続
- 冪等性を維持（confirmedAtでガード）
- confirmedの正規化サマリを `sessions.summary` に保存

---

## ランキング表示

### 暫定（open中）
- `rankings/{seasonId}_{division}` を参照
- UIで「暫定」と明示

### 公式（finalized）
- `banzukeSnapshots/{seasonId}_{division}` を参照
- UIで「公式結果」と明示

---

## コスト最適化

1. クライアントはランキング/成績の都度集計をしない
2. 必ずキャッシュドキュメント参照（read削減）
3. ランキング更新は5〜15分間隔（リアルタイム不要）

---

## セキュリティ強化

### Security Rules

| コレクション | クライアント | サーバ |
|--------------|-------------|--------|
| sessions/rounds | 本人のみ書込 | 確定フィールド更新可 |
| rankings | 読取のみ | 書込可 |
| banzukeSnapshots | 読取のみ | 書込可 |
| titles | 読取のみ | 書込可 |
| auditLogs | 読取不可 | 書込可 |

---

## 運用管理

### 緊急時対応

管理者向けに以下を用意：
- 不正再計算の実行
- 告知文の登録
- 凍結/確定の手動トリガ（緊急時）

### 監査ログ

以下のイベントを記録：
- 確定
- 無効判定
- 再計算
- 称号付与

---

## UI方針

### 段階0からの継承
- 12枚固定・4×3・73:52・操作順固定
- 段階1は"運用自動化"に集中（UIの多様化を避ける）

### 番付表示の明確化
- 暫定（open中）と公式（finalized）をUI上で明確に区別
- 誤解防止のためラベル/バッジで状態を表示
