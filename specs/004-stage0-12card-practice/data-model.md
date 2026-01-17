# Data Model: 段階0 12枚固定練習UI・公式競技・番付

**Date**: 2026-01-18
**Branch**: `004-stage0-12card-practice`

## Overview

憲法v7.0.0で定義されたデータモデルに基づき、Firestore コレクションの詳細設計を行う。

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   seasons   │       │    users    │       │   poems     │
│  (シーズン) │       │  (ユーザー) │       │   (歌)      │
└──────┬──────┘       └──────┬──────┘       └─────────────┘
       │                     │                    (クライアント同梱)
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│   entries   │◄──────│  sessions   │
│ (エントリー)│       │ (セッション)│
└─────────────┘       └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   rounds    │
                      │ (ラウンド)  │
                      │ (サブコレ)  │
                      └─────────────┘

       │                     │
       └──────────┬──────────┘
                  ▼
           ┌─────────────┐
           │  rankings   │
           │  (番付)     │
           └─────────────┘

                  ▼
           ┌─────────────┐
           │  userStats  │
           │ (ユーザー統計)│
           └─────────────┘
```

---

## Collections

### 1. poems（クライアント同梱）

歌データ。`data/poems.seed.json` からクライアントに同梱。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| poemId | string | ✓ | 一意識別子（例: "poem_001"） |
| order | number | ✓ | 歌番号（1-100） |
| yomi | string | ✓ | 上の句（漢字かな交じり） |
| yomiKana | string | ✓ | 上の句（ひらがな） |
| tori | string | ✓ | 下の句（漢字かな交じり） |
| toriKana | string | ✓ | 下の句（ひらがな） |
| yomiTokens | string[] | ✓ | 上の句（改行用トークン） |
| yomiKanaTokens | string[] | ✓ | 上の句ひらがな（改行用） |
| toriTokens | string[] | ✓ | 下の句（改行用トークン） |
| toriKanaTokens | string[] | ✓ | 下の句ひらがな（改行用） |
| yomiNoSpace | string | ✓ | 上の句（スペースなし） |
| yomiKanaNoSpace | string | ✓ | 上の句ひらがな（スペースなし） |
| toriNoSpace | string | ✓ | 下の句（スペースなし） |
| toriKanaNoSpace | string | ✓ | 下の句ひらがな（スペースなし） |
| kimariji | string | ✓ | 決まり字 |
| kimarijiCount | number | ✓ | 決まり字数（1-6） |
| author | string | ✓ | 作者名 |

**Example**:
```json
{
  "poemId": "poem_001",
  "order": 1,
  "yomi": "秋の田の かりほの庵の 苫をあらみ",
  "yomiKana": "あきのたの かりほのいほの とまをあらみ",
  "tori": "わが衣手は 露にぬれつつ",
  "toriKana": "わがころもでは つゆにぬれつつ",
  "yomiTokens": ["秋の田の", "かりほの庵の", "苫をあらみ"],
  "yomiKanaTokens": ["あきのたの", "かりほのいほの", "とまをあらみ"],
  "toriTokens": ["わが衣手は", "露にぬれつつ"],
  "toriKanaTokens": ["わがころもでは", "つゆにぬれつつ"],
  "yomiNoSpace": "秋の田のかりほの庵の苫をあらみ",
  "yomiKanaNoSpace": "あきのたのかりほのいほのとまをあらみ",
  "toriNoSpace": "わが衣手は露にぬれつつ",
  "toriKanaNoSpace": "わがころもではつゆにぬれつつ",
  "kimariji": "あきの",
  "kimarijiCount": 3,
  "author": "天智天皇"
}
```

---

### 2. users/{uid}

ユーザー情報。Firebase Authのuidをドキュメントキーとして使用。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| nickname | string | ✓ | 表示名（番付表示用） |
| banzukeConsent | boolean | ✓ | 番付掲載同意 |
| rank | string | | 級位/段位（例: "六級"） |
| createdAt | Timestamp | ✓ | 作成日時 |
| updatedAt | Timestamp | ✓ | 更新日時 |

**Validation Rules**:
- nickname: 1-20文字
- banzukeConsent: エントリー時にtrueが必須

**Example**:
```json
{
  "nickname": "かるた太郎",
  "banzukeConsent": true,
  "rank": "六級",
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

---

### 3. seasons/{seasonId}

シーズン情報。管理者が手動で作成。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| seasonId | string | ✓ | シーズンID（例: "2026_spring"） |
| name | string | ✓ | 表示名（例: "2026年春場所"） |
| startDate | Timestamp | ✓ | 開始日時 |
| endDate | Timestamp | ✓ | 終了日時 |
| status | string | ✓ | "upcoming" / "active" / "ended" |

**seasonId Format**: `YYYY_{spring|summer|autumn|winter}`

**Example**:
```json
{
  "seasonId": "2026_spring",
  "name": "2026年春場所",
  "startDate": "2026-02-01T00:00:00+09:00",
  "endDate": "2026-04-30T23:59:59+09:00",
  "status": "active"
}
```

---

### 4. entries/{entryId}

シーズンへのエントリー情報。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| uid | string | ✓ | ユーザーID |
| seasonId | string | ✓ | シーズンID |
| division | string | ✓ | "kyu"（級位の部）/ "dan"（段位の部） |
| consentAt | Timestamp | ✓ | 同意日時 |
| createdAt | Timestamp | ✓ | 作成日時 |

**Validation Rules**:
- division "dan" の場合、user.rank が "六級" 以上であること
- 同一seasonIdに対して1ユーザー1エントリーのみ

**entryId Format**: `{uid}_{seasonId}`（ユニーク制約）

**Example**:
```json
{
  "uid": "user123",
  "seasonId": "2026_spring",
  "division": "kyu",
  "consentAt": "2026-02-01T12:00:00+09:00",
  "createdAt": "2026-02-01T12:00:00+09:00"
}
```

---

### 5. sessions/{sessionId}

公式競技セッション。50問1セット。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| uid | string | ✓ | ユーザーID |
| seasonId | string | ✓ | シーズンID |
| entryId | string | ✓ | エントリーID |
| roundCount | number | ✓ | ラウンド数（50固定） |
| status | string | ✓ | セッション状態 |
| startedAt | Timestamp | ✓ | 開始日時 |
| submittedAt | Timestamp | | 提出日時（クライアント） |
| confirmedAt | Timestamp | | 確定日時（サーバー） |
| score | number | | スコア（confirmed時のみ） |
| correctCount | number | | 正答数 |
| totalElapsedMs | number | | 合計所要時間（ms） |
| invalidReasons | string[] | | 無効理由（invalid時のみ） |
| dayKeyJst | string | | JST日付キー（"YYYY-MM-DD"） |

**Status Values**:
```
"created"     → セッション作成済み、未開始
"in_progress" → 回答中
"submitted"   → 提出済み、検証待ち
"confirmed"   → 確定済み（公式記録）
"invalid"     → 無効（参考記録）
"expired"     → 期限切れ（60分経過）
```

**State Transitions**:
```
created → in_progress → submitted → confirmed
                                  → invalid
                      → expired (60分経過)
```

**Example**:
```json
{
  "uid": "user123",
  "seasonId": "2026_spring",
  "entryId": "user123_2026_spring",
  "roundCount": 50,
  "status": "confirmed",
  "startedAt": "2026-02-15T14:00:00+09:00",
  "submittedAt": "2026-02-15T14:10:30+09:00",
  "confirmedAt": "2026-02-15T14:10:31+09:00",
  "score": 4800,
  "correctCount": 48,
  "totalElapsedMs": 630000,
  "dayKeyJst": "2026-02-15"
}
```

---

### 6. sessions/{sessionId}/rounds/{roundIndex}

セッション内の各ラウンド（問題）データ。サブコレクション。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| roundIndex | number | ✓ | ラウンド番号（0-49） |
| correctPoemId | string | ✓ | 正解の歌ID |
| choices | string[] | ✓ | 選択肢（12個のpoemId） |
| selectedPoemId | string | ✓ | 選択した歌ID |
| isCorrect | boolean | ✓ | 正解かどうか |
| clientElapsedMs | number | ✓ | 回答時間（ms） |

**Document ID**: roundIndexを文字列化（"00", "01", ... "49"）

**Example**:
```json
{
  "roundIndex": 0,
  "correctPoemId": "poem_042",
  "choices": ["poem_001", "poem_015", "poem_023", "poem_042", "poem_051", "poem_067", "poem_072", "poem_078", "poem_083", "poem_089", "poem_094", "poem_099"],
  "selectedPoemId": "poem_042",
  "isCorrect": true,
  "clientElapsedMs": 1850
}
```

---

### 7. rankings/{rankingId}

シーズン×部門ごとの番付キャッシュ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| seasonId | string | ✓ | シーズンID |
| division | string | ✓ | "kyu" / "dan" |
| entries | array | ✓ | ランキングエントリー配列 |
| updatedAt | Timestamp | ✓ | 最終更新日時 |

**entries[] 内の各要素**:
| Field | Type | Description |
|-------|------|-------------|
| uid | string | ユーザーID |
| nickname | string | 表示名 |
| score | number | ベストスコア |
| rank | number | 順位 |
| confirmedSessions | number | 確定セッション数 |

**rankingId Format**: `{seasonId}_{division}`

**Example**:
```json
{
  "seasonId": "2026_spring",
  "division": "kyu",
  "entries": [
    { "uid": "user456", "nickname": "かるた花子", "score": 5200, "rank": 1, "confirmedSessions": 15 },
    { "uid": "user123", "nickname": "かるた太郎", "score": 4800, "rank": 2, "confirmedSessions": 10 },
    { "uid": "user789", "nickname": "かるた次郎", "score": 4500, "rank": 3, "confirmedSessions": 8 }
  ],
  "updatedAt": "2026-02-15T14:10:31+09:00"
}
```

---

### 8. userStats/{uid}

ユーザーごとの統計情報。サーバーで更新。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| totalSessions | number | ✓ | 総セッション数 |
| confirmedSessions | number | ✓ | 確定セッション数 |
| bestScore | number | ✓ | ベストスコア |
| currentRank | string | | 現在の級位/段位 |

**Example**:
```json
{
  "totalSessions": 12,
  "confirmedSessions": 10,
  "bestScore": 4800,
  "currentRank": "六級"
}
```

---

## Indexes

### Composite Indexes

1. **sessions** - ユーザーのセッション一覧取得
   - `uid` (ASC) + `startedAt` (DESC)

2. **sessions** - シーズンのセッション一覧取得
   - `seasonId` (ASC) + `status` (ASC) + `score` (DESC)

3. **entries** - ユーザーのエントリー確認
   - `uid` (ASC) + `seasonId` (ASC)

---

## TypeScript Types

```typescript
// types/poem.ts
export interface Poem {
  poemId: string;
  order: number;
  yomi: string;
  yomiKana: string;
  tori: string;
  toriKana: string;
  yomiTokens: string[];
  yomiKanaTokens: string[];
  toriTokens: string[];
  toriKanaTokens: string[];
  yomiNoSpace: string;
  yomiKanaNoSpace: string;
  toriNoSpace: string;
  toriKanaNoSpace: string;
  kimariji: string;
  kimarijiCount: number;
  author: string;
}

// types/session.ts
export type SessionStatus =
  | 'created'
  | 'in_progress'
  | 'submitted'
  | 'confirmed'
  | 'invalid'
  | 'expired';

export interface Session {
  uid: string;
  seasonId: string;
  entryId: string;
  roundCount: number;
  status: SessionStatus;
  startedAt: Date;
  submittedAt?: Date;
  confirmedAt?: Date;
  score?: number;
  correctCount?: number;
  totalElapsedMs?: number;
  invalidReasons?: string[];
  dayKeyJst?: string;
}

export interface Round {
  roundIndex: number;
  correctPoemId: string;
  choices: string[];
  selectedPoemId: string;
  isCorrect: boolean;
  clientElapsedMs: number;
}

// types/entry.ts
export type Division = 'kyu' | 'dan';

export interface Entry {
  uid: string;
  seasonId: string;
  division: Division;
  consentAt: Date;
  createdAt: Date;
}

// types/ranking.ts
export interface RankingEntry {
  uid: string;
  nickname: string;
  score: number;
  rank: number;
  confirmedSessions: number;
}

export interface Ranking {
  seasonId: string;
  division: Division;
  entries: RankingEntry[];
  updatedAt: Date;
}
```

---

## Validation Summary

| Collection | Constraint | Enforced By |
|------------|-----------|-------------|
| entries | 1ユーザー1シーズン1エントリー | entryId = uid_seasonId |
| entries | 段位の部は六級以上 | Cloud Functions |
| sessions | 60分でexpired | Cloud Functions |
| sessions | score等はサーバーのみ更新 | Security Rules |
| rounds | 50問固定 | 異常値検出 |
| rankings | confirmedのみ反映 | Cloud Functions |
