# 段階1: データモデル

## 新規コレクション

### seasons/{seasonId}

シーズン管理。状態遷移を持つ。

```typescript
interface Season {
  seasonId: string;          // "2026_spring", "2026_winter"
  name: string;              // "2026年春場所"
  status: SeasonStatus;
  startDate: Timestamp;
  freezeDate?: Timestamp;
  finalizeDate?: Timestamp;
  archiveDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type SeasonStatus = "open" | "frozen" | "finalized" | "archived";
```

---

### rankings/{seasonId}_{division}

暫定ランキングキャッシュ。open中に5〜15分間隔で更新。

```typescript
interface RankingCache {
  seasonId: string;
  division: Division;
  entries: RankingEntry[];
  totalParticipants: number;
  updatedAt: Timestamp;
}

interface RankingEntry {
  uid: string;
  nickname: string;
  rank: number;
  score: number;
  sessionCount: number;
  lastReflectedSubmittedAt: Timestamp;
}

type Division = "kyu" | "dan";
```

---

### banzukeSnapshots/{seasonId}_{division}

確定番付スナップショット。finalized時に作成、以降変更なし。

```typescript
interface BanzukeSnapshot {
  seasonId: string;
  division: Division;
  status: "finalized";
  entries: BanzukeEntry[];
  totalParticipants: number;
  createdAt: Timestamp;
}

interface BanzukeEntry {
  uid: string;
  nickname: string;
  rank: number;
  score: number;
  sessionCount: number;
  lastReflectedSubmittedAt: Timestamp;
  // 称号対象の場合
  isChampion?: boolean;
}
```

---

### dailyReflections/{seasonId}_{division}_{yyyymmdd}

日次上位3セッション記録。

```typescript
interface DailyReflection {
  seasonId: string;
  division: Division;
  dayKeyJst: string;         // "2026-01-18"
  topSessions: TopSession[];
  createdAt: Timestamp;
}

interface TopSession {
  sessionId: string;
  uid: string;
  nickname: string;
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  submittedAt: Timestamp;
}
```

---

### titles/{uid}

称号履歴。

```typescript
interface Title {
  uid: string;
  nickname: string;
  meijinCount: number;       // 名人回数（4回で達成）
  eiseiCount: number;        // 永世回数（8回で達成）
  isMeijin: boolean;         // 名人資格保持
  isEisei: boolean;          // 永世資格保持
  history: TitleHistory[];
  updatedAt: Timestamp;
}

interface TitleHistory {
  seasonId: string;
  division: "dan";           // 段位の部のみ対象
  rank: number;              // 1位のみカウント
  totalParticipants: number; // 24名以上が条件
  awardedAt: Timestamp;
}
```

---

### auditLogs/{eventId}

監査ログ。サーバのみ書込可。

```typescript
interface AuditLog {
  eventId: string;
  eventType: AuditEventType;
  seasonId?: string;
  uid?: string;
  sessionId?: string;
  details: Record<string, unknown>;
  createdAt: Timestamp;
  createdBy: string;         // "system" or admin uid
}

type AuditEventType =
  | "session_confirmed"
  | "session_invalidated"
  | "season_frozen"
  | "season_finalized"
  | "ranking_recalculated"
  | "title_awarded";
```

---

## 既存コレクション拡張

### sessions/{sessionId}

段階0からの拡張フィールド：

```typescript
interface Session {
  // ... 段階0のフィールド ...

  // 段階1追加
  isRankEligible: boolean;   // 番付反映対象
  reflectedAt?: Timestamp;   // 番付反映日時
  summary?: SessionSummary;  // 正規化サマリ
}

interface SessionSummary {
  score: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  accuracy: number;          // 正答率 (0-100)
}
```

### users/{uid}

段階0からの拡張フィールド：

```typescript
interface User {
  // ... 段階0のフィールド ...

  // 段階1追加
  subscription?: Subscription;
}

interface Subscription {
  status: "active" | "canceled" | "expired";
  plan: string;
  currentPeriodEnd: Timestamp;
  canceledAt?: Timestamp;
}
```

---

## インデックス設計

### sessions

```
(seasonId, division, status, dayKeyJst) - 日次集計用
(seasonId, division, status, score DESC) - ランキング用
(uid, seasonId, status) - ユーザー別取得用
```

### dailyReflections

```
(seasonId, division, dayKeyJst DESC) - 日次取得用
```

### rankings

```
(seasonId, division) - 単一取得のためインデックス不要
```

---

## セキュリティルール概要

| コレクション | read | write |
|--------------|------|-------|
| seasons | 全員 | サーバのみ |
| rankings | 全員 | サーバのみ |
| banzukeSnapshots | 全員 | サーバのみ |
| dailyReflections | 認証済 | サーバのみ |
| titles | 全員 | サーバのみ |
| auditLogs | 管理者のみ | サーバのみ |
| sessions | 本人のみ | 本人（制限付）+ サーバ |
| users | 本人のみ | 本人（制限付） |
