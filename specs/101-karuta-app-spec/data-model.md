# Data Model: 百人一首競技カルタアプリ

**Feature**: 101-karuta-app-spec
**Date**: 2026-01-18

---

## 概要

本ドキュメントはFirestoreコレクション設計とTypeScript型定義を記述する。

---

## Firestoreコレクション構成

```text
firestore/
├── users/{uid}                    # ユーザー情報
├── userLearned/{uid}              # 覚えた札（ユーザー別）
├── entries/{entryId}              # シーズンエントリー
├── sessions/{sessionId}           # 公式競技セッション
│   └── rounds/{roundIndex}        # ラウンド詳細（サブコレクション）
├── seasons/{seasonId}             # シーズン情報
├── rankings/{seasonId}_{division} # 番付キャッシュ（3時間更新）
├── hallOfFame/{id}                # 殿堂キャッシュ
├── userStats/{uid}                # ユーザー統計
├── banzukeSnapshots/{seasonId}_{division}  # (段階1) 確定番付スナップショット
├── dailyReflections/{id}          # (段階1) 日次反映記録
├── titles/{uid}                   # (段階1) 称号履歴
└── auditLogs/{eventId}            # (段階1) 監査ログ
```

---

## エンティティ詳細

### 1. Poem（札）- クライアント同梱

**Storage**: `apps/web/src/data/poems.seed.json`（JSONファイル）

```typescript
interface Poem {
  poemId: string;           // 一意識別子（例："poem_001"）
  order: number;            // 歌番号（1-100）

  // 読札（上の句）
  yomi: string;             // 漢字かな交じり
  yomiKana: string;         // ひらがな
  yomiTokens: string[];     // 改行レンダリング用トークン
  yomiKanaTokens: string[]; // ひらがなトークン
  yomiNoSpace: string;      // スペースなし連結
  yomiKanaNoSpace: string;  // ひらがなスペースなし

  // 取札（下の句）
  tori: string;             // 漢字かな交じり
  toriKana: string;         // ひらがな
  toriTokens: string[];     // 改行レンダリング用トークン
  toriKanaTokens: string[]; // ひらがなトークン
  toriNoSpace: string;      // スペースなし連結
  toriKanaNoSpace: string;  // ひらがなスペースなし

  // 決まり字
  kimariji: string;         // 決まり字（例："む"）
  kimarijiCount: number;    // 決まり字数（1-6）

  // 作者
  author: string;           // 作者名
}
```

**Validation**:
- poemId: 必須、一意
- order: 1〜100の整数
- kimarijiCount: 1〜6の整数
- 全文字列フィールド: 必須

---

### 2. User（ユーザー）

**Collection**: `users/{uid}`

```typescript
interface User {
  uid: string;              // Firebase Auth UID
  nickname: string;         // 表示名（番付表示用、必須）
  banzukeConsent: boolean;  // 番付公開同意（必須、true前提）
  rank: string;             // 現在の級位/段位（例："六級"、"初段"）

  createdAt: Timestamp;     // 作成日時
  updatedAt: Timestamp;     // 更新日時

  // 段階1追加
  subscription?: Subscription;
}

interface Subscription {
  status: 'active' | 'canceled' | 'expired';
  plan: string;
  currentPeriodEnd: Timestamp;
  canceledAt?: Timestamp;
}
```

**Validation**:
- nickname: 1〜20文字、必須
- banzukeConsent: エントリー時にtrue必須
- rank: 有効な級位/段位文字列

**Security Rules**:
- read: 本人のみ
- write: 本人のみ（nickname, banzukeConsentのみ）
- rank更新: サーバーのみ

---

### 3. UserLearned（覚えた札）

**Collection**: `userLearned/{uid}`

```typescript
interface UserLearned {
  uid: string;
  learnedPoemIds: string[];  // 覚えた札のpoemId配列
  updatedAt: Timestamp;
}
```

**Validation**:
- learnedPoemIds: 有効なpoemIdのみ

**Security Rules**:
- read: 本人のみ
- write: 本人のみ

---

### 4. Entry（エントリー）

**Collection**: `entries/{entryId}`

```typescript
interface Entry {
  entryId: string;          // 自動生成ID
  uid: string;              // ユーザーUID
  seasonId: string;         // シーズンID（例："2026_spring"）
  division: 'kyu' | 'dan';  // 部門（級位の部/段位の部）

  consentAt: Timestamp;     // 同意日時
  createdAt: Timestamp;     // 作成日時
  canceledAt?: Timestamp;   // キャンセル日時
}
```

**Validation**:
- uid: 有効なFirebase UID
- seasonId: 有効なシーズンID
- division: 'kyu' または 'dan'
- 段位の部: ユーザーが六級以上を保有している必要あり
- 同一シーズン・同一ユーザーの重複エントリー禁止

**Security Rules**:
- read: 本人のみ
- create: 本人のみ（consentAt必須）
- update: キャンセルのみ許可

---

### 5. Session（公式競技セッション）

**Collection**: `sessions/{sessionId}`

```typescript
interface Session {
  sessionId: string;        // 自動生成ID
  uid: string;              // ユーザーUID
  seasonId: string;         // シーズンID
  entryId: string;          // エントリーID

  roundCount: 50;           // 固定値
  status: SessionStatus;    // セッション状態

  startedAt: Timestamp;     // 開始日時
  submittedAt?: Timestamp;  // 提出日時（クライアント）
  confirmedAt?: Timestamp;  // 確定日時（サーバー）

  // サーバー算出（confirmed時のみ）
  score?: number;           // スコア
  correctCount?: number;    // 正解数
  totalElapsedMs?: number;  // 合計解答時間（ms）

  // 異常検知
  invalidReasons?: string[]; // invalid理由

  // 日付管理
  dayKeyJst: string;        // "YYYY-MM-DD"（JST）

  // 段階1追加
  isRankEligible?: boolean; // 番付反映対象
  reflectedAt?: Timestamp;  // 番付反映日時
}

type SessionStatus =
  | 'created'      // 作成済み
  | 'in_progress'  // 実施中
  | 'submitted'    // 提出済み
  | 'confirmed'    // 確定
  | 'invalid'      // 無効
  | 'expired';     // 有効期限切れ
```

**State Transitions**:
```
created → in_progress → submitted → confirmed
                                  → invalid
                                  → expired
```

**Validation**:
- 開始から60分経過でexpired
- confirmedのみ番付反映対象

**Security Rules**:
- read: 本人のみ
- create: 本人のみ（エントリー済み必須）
- update: status, submittedAtのみ（本人）
- score, confirmedAt等: サーバーのみ

---

### 6. Round（ラウンド）

**Collection**: `sessions/{sessionId}/rounds/{roundIndex}`

```typescript
interface Round {
  roundIndex: number;       // 0-49
  correctPoemId: string;    // 正解のpoemId
  choices: string[];        // 選択肢（12個のpoemId）

  selectedPoemId?: string;  // 選択されたpoemId
  isCorrect?: boolean;      // 正解かどうか
  clientElapsedMs?: number; // 解答時間（ms）
}
```

**Validation**:
- roundIndex: 0〜49
- choices: 12個のpoemId
- selectedPoemIdはchoices内に存在する必要あり
- clientElapsedMs: 0以上の整数

**Security Rules**:
- read: 本人のみ
- write: 本人のみ（セッションがin_progress時のみ）

---

### 7. Season（シーズン）

**Collection**: `seasons/{seasonId}`

```typescript
interface Season {
  seasonId: string;         // "YYYY_{spring|summer|autumn|winter}"
  name: string;             // 表示名（例："2026年春戦"）

  startDate: Timestamp;     // 開始日時
  endDate: Timestamp;       // 終了日時

  status: SeasonStatus;     // シーズン状態

  // 段階1追加
  frozenAt?: Timestamp;     // 凍結日時
  finalizedAt?: Timestamp;  // 確定日時
  archivedAt?: Timestamp;   // アーカイブ日時
}

type SeasonStatus =
  | 'upcoming'    // 開始前
  | 'active'      // 受付中（段階0の"open"相当）
  | 'frozen'      // 凍結（段階1）
  | 'finalized'   // 確定（段階1）
  | 'archived';   // アーカイブ（段階1）
```

**State Transitions (段階1)**:
```
upcoming → active → frozen → finalized → archived
```

**Security Rules**:
- read: 全員
- write: サーバーのみ

---

### 8. Ranking（番付キャッシュ）

**Collection**: `rankings/{seasonId}_{division}`

```typescript
interface Ranking {
  seasonId: string;
  division: 'kyu' | 'dan';

  entries: RankingEntry[];  // 順位リスト（上位100名）
  totalParticipants: number; // 総参加者数

  updatedAt: Timestamp;     // 最終更新日時
}

interface RankingEntry {
  rank: number;             // 順位（1〜）
  uid: string;              // ユーザーUID
  nickname: string;         // 表示名
  score: number;            // スコア
  confirmedSessions: number; // 確定セッション数
}
```

**Update Frequency**: 3時間ごと（Scheduled Function）

**Security Rules**:
- read: 全員
- write: サーバーのみ

---

### 9. HallOfFame（殿堂キャッシュ）

**Collection**: `hallOfFame/{id}`

```typescript
interface HallOfFame {
  id: string;               // 自動生成ID
  seasonId: string;         // シーズンID
  division: 'kyu' | 'dan';  // 部門

  topThree: HallOfFameEntry[]; // 上位3名

  updatedAt: Timestamp;
}

interface HallOfFameEntry {
  rank: number;             // 1, 2, 3
  nickname: string;         // 表示名のみ（プライバシー）
  score: number;            // スコア
}
```

**Security Rules**:
- read: 全員
- write: サーバーのみ

---

### 10. UserStats（ユーザー統計）

**Collection**: `userStats/{uid}`

```typescript
interface UserStats {
  uid: string;

  // 全体統計
  totalSessions: number;      // 総セッション数
  confirmedSessions: number;  // 確定セッション数

  // ベスト記録
  bestScore: number;          // 最高スコア

  // 現在の級位/段位
  currentRank: string;        // 例："六級"

  // 決まり字別成績
  byKimarijiCount: {
    [count: string]: {
      correct: number;
      total: number;
      avgElapsedMs: number;
    };
  };

  // 札別成績
  byPoem: {
    [poemId: string]: {
      correct: number;
      total: number;
      avgElapsedMs: number;
    };
  };

  updatedAt: Timestamp;
}
```

**Security Rules**:
- read: 本人のみ
- write: サーバーのみ

---

## 段階1追加コレクション

### BanzukeSnapshot（確定番付スナップショット）

**Collection**: `banzukeSnapshots/{seasonId}_{division}`

```typescript
interface BanzukeSnapshot {
  seasonId: string;
  division: 'kyu' | 'dan';

  entries: BanzukeEntry[];  // 全参加者リスト
  participantCount: number; // 参加者数（称号判定用）

  finalizedAt: Timestamp;   // 確定日時
}

interface BanzukeEntry {
  rank: number;
  uid: string;
  nickname: string;
  score: number;
  confirmedSessions: number;
  reflectedSessions: number;
}
```

---

### DailyReflection（日次反映記録）

**Collection**: `dailyReflections/{seasonId}_{division}_{yyyymmdd}`

```typescript
interface DailyReflection {
  seasonId: string;
  division: 'kyu' | 'dan';
  dayKeyJst: string;        // "YYYY-MM-DD"

  topThreeSessions: {
    sessionId: string;
    uid: string;
    score: number;
  }[];

  createdAt: Timestamp;
}
```

---

### Title（称号履歴）

**Collection**: `titles/{uid}`

```typescript
interface TitleRecord {
  uid: string;

  meijinCount: number;      // 名人獲得回数
  eiseiCount: number;       // 永世獲得回数

  history: {
    seasonId: string;
    rank: number;           // 1位なら称号カウント対象
    division: 'dan';        // 段位の部のみ
  }[];

  currentTitles: ('meijin' | 'eisei')[]; // 現在保持称号

  updatedAt: Timestamp;
}
```

---

## インデックス定義

**firestore.indexes.json**:

```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "seasonId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "score", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "seasonId", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## Security Rules概要

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ユーザー
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // 覚えた札
    match /userLearned/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // エントリー
    match /entries/{entryId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }

    // セッション
    match /sessions/{sessionId} {
      allow read: if request.auth != null && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && resource.data.uid == request.auth.uid
                    && onlyAllowedFields(['status', 'submittedAt']);

      match /rounds/{roundIndex} {
        allow read, write: if request.auth != null
                          && get(/databases/$(database)/documents/sessions/$(sessionId)).data.uid == request.auth.uid;
      }
    }

    // シーズン・番付・殿堂（公開読み取り）
    match /seasons/{seasonId} {
      allow read: if true;
    }
    match /rankings/{id} {
      allow read: if true;
    }
    match /hallOfFame/{id} {
      allow read: if true;
    }

    // ユーザー統計
    match /userStats/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## ER図（概念）

```
User ─────────< Entry >───────── Season
  │                                  │
  │                                  │
  └─────────< Session >──────────────┘
                │
                └── Round[] (subcollection)

Ranking ←──── computed from ──── Session (confirmed)
HallOfFame ←── computed from ──── Ranking (finalized)
UserStats ←── computed from ──── Session (confirmed)
```
