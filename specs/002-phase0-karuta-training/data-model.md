# Data Model: Phase 0 - 競技かるた訓練プラットフォーム

**Feature**: Phase 0 Karuta Training Platform
**Date**: 2026-01-17
**Storage**: Firebase Firestore (NoSQL)

## Overview

段階0のデータモデルは、Firestore（NoSQL）を使用し、以下の3つのコアエンティティで構成される：

1. **Poem**: 百人一首の1首を表すマスタデータ（100件、read-only）
2. **User**: ユーザー基本情報（最小限）
3. **TrainingSet**: 訓練セットの結果（ユーザー配下サブコレクション）

## Collection Structure

```text
/poems/{poemId}                          # 公開マスタ（read-only）
/users/{uid}                             # ユーザープロフィール
/users/{uid}/trainingSets/{setId}        # 訓練結果（user-scoped）
```

---

## Entity Definitions

### 1. Poem（百人一首マスタ）

**Firestore Path**: `/poems/{poemId}`

**Purpose**: 百人一首100首のマスタデータ。全ユーザーが読み取り可能だが、書き込みはAdmin SDKまたはFirebase Consoleのみ。

**Document ID**: `poemId`（例: `"p001"`, `"p002"`, ..., `"p100"`）

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `poemId` | string | ✅ | ドキュメントIDと同一（`p001`〜`p100`） | 正規表現: `^p\d{3}$` |
| `order` | number | ✅ | 百人一首の番号（1〜100） | 1 ≤ order ≤ 100 |
| `yomi` | string | ✅ | 読札（上の句）のテキスト | 非空文字列、最大200文字 |
| `yomiKana` | string | ✅ | 読札のひらがな表記 | 非空文字列、最大200文字 |
| `tori` | string | ✅ | 取札（下の句）のテキスト | 非空文字列、最大200文字 |
| `toriKana` | string | ✅ | 取札のひらがな表記 | 非空文字列、最大200文字 |
| `kimarijiCount` | number | ✅ | 決まり字の数（1〜6） | 1 ≤ kimarijiCount ≤ 6 |
| `kimariji` | string | ✅ | 決まり字（文字列） | 非空文字列、最大10文字 |
| `author` | string | ✅ | 作者名 | 非空文字列、最大50文字 |
| `updatedAt` | timestamp | ❌ | 更新日時（任意） | Firestore serverTimestamp() |

**TypeScript Type Definition**:

```typescript
// src/types/poem.ts
export interface Poem {
  poemId: string;         // "p001" to "p100"
  order: number;          // 1 to 100
  yomi: string;           // 読札（上の句）
  yomiKana: string;       // 読札ひらがな
  tori: string;           // 取札（下の句）
  toriKana: string;       // 取札ひらがな
  kimarijiCount: number;  // 1 to 6
  kimariji: string;       // 決まり字
  author: string;         // 作者名
  updatedAt?: Timestamp;  // Optional: Firestore timestamp
}
```

**Indexes**:

- **Single-field indexes** (automatic):
  - `order` (for sorting by poem number)
  - `kimarijiCount` (for filtering by決まり字数)
  - `kimariji` (for filtering by決まり字)

- **Composite indexes** (if needed in Phase 1+):
  - `(kimarijiCount, order)` - for filtered + sorted queries

**Access Control** (Firestore Security Rules):

```javascript
match /poems/{poemId} {
  allow read: if true;        // Public read access
  allow write: if false;      // Only Admin SDK or Console
}
```

**Data Source**: `data/poems.seed.json`（100件の事前定義データ）

---

### 2. User（ユーザー）

**Firestore Path**: `/users/{uid}`

**Purpose**: ユーザーの基本情報を保存（段階0は最小限、段階1以降で拡張）。

**Document ID**: `uid`（Firebase Auth UID）

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `uid` | string | ✅ | Firebase Auth UID（ドキュメントIDと同一） | 自動生成（Firebase Auth） |
| `displayName` | string | ❌ | 表示名（任意、段階0では最小） | 最大100文字 |
| `createdAt` | timestamp | ✅ | 作成日時 | Firestore serverTimestamp() |

**TypeScript Type Definition**:

```typescript
// src/types/user.ts
import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;              // Firebase Auth UID
  displayName?: string;     // Optional display name
  createdAt: Timestamp;     // Server timestamp
}
```

**Indexes**: None required（基本的なread/writeのみ）

**Access Control** (Firestore Security Rules):

```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

**Creation Flow**:

1. ユーザーがGoogle/匿名ログインを完了
2. Firebase Authがuidを生成
3. フロントエンドが`/users/{uid}`にドキュメント作成（存在しない場合のみ）
4. `createdAt`にserverTimestamp()を設定

---

### 3. TrainingSet（訓練セット結果）

**Firestore Path**: `/users/{uid}/trainingSets/{setId}`

**Purpose**: 訓練セットの結果を保存（ユーザー配下サブコレクション）。異常値判定を含む。

**Document ID**: `setId`（自動生成ID）

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `mode` | string | ✅ | モード（段階0は常に`"training"`） | `mode === "training"` |
| `choiceCount` | number | ✅ | 選択肢数（8または16） | `choiceCount === 8 || choiceCount === 16` |
| `filter` | object | ✅ | フィルタ条件 | 下記参照 |
| `filter.kimariji` | string | ❌ | 決まり字フィルタ（任意） | 最大10文字 |
| `filter.kimarijiCount` | number | ❌ | 決まり字数フィルタ（任意） | 1 ≤ kimarijiCount ≤ 6 |
| `startedAtClientMs` | number | ✅ | 開始時刻（クライアント側Date.now()） | 正の整数 |
| `submittedAtClientMs` | number | ✅ | 提出時刻（クライアント側Date.now()） | 正の整数、≥ startedAtClientMs |
| `submittedAt` | timestamp | ✅ | 提出時刻（サーバータイムスタンプ） | Firestore serverTimestamp() |
| `items` | array | ✅ | 各問の結果配列（最大30問推奨） | 下記参照 |
| `summary` | object | ✅ | 集計結果 | 下記参照 |
| `summary.total` | number | ✅ | 総問題数 | items.length |
| `summary.correct` | number | ✅ | 正答数 | 0 ≤ correct ≤ total |
| `summary.avgElapsedMs` | number | ✅ | 平均時間（ミリ秒） | ≥ 0 |
| `flags` | object | ✅ | フラグ | 下記参照 |
| `flags.isReference` | boolean | ✅ | 参考記録フラグ（段階0は常にtrue） | true |
| `flags.invalidReason` | string | ❌ | 無効理由（異常値検出時） | 下記参照 |

**Items Array Element**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `poemId` | string | ✅ | 正解の詩ID（`p001`〜`p100`） | 正規表現: `^p\d{3}$` |
| `isCorrect` | boolean | ✅ | 正誤判定 | true/false |
| `clientElapsedMs` | number | ✅ | 経過時間（ミリ秒） | ≥ 0 |
| `chosenPoemId` | string | ✅ | 選択した詩ID | 正規表現: `^p\d{3}$` |
| `presentedAtClientMs` | number | ✅ | 問題表示時刻（Date.now()） | 正の整数 |

**TypeScript Type Definition**:

```typescript
// src/types/trainingSet.ts
import { Timestamp } from 'firebase/firestore';

export interface TrainingSetItem {
  poemId: string;               // Correct poem ID (p001-p100)
  isCorrect: boolean;           // Whether answer was correct
  clientElapsedMs: number;      // Time taken in milliseconds
  chosenPoemId: string;         // User's selected poem ID
  presentedAtClientMs: number;  // When question was presented (Date.now())
}

export interface TrainingSetFilter {
  kimariji?: string;            // Optional: filter by決まり字
  kimarijiCount?: number;       // Optional: filter by決まり字数
}

export interface TrainingSetSummary {
  total: number;                // Total questions
  correct: number;              // Correct answers
  avgElapsedMs: number;         // Average time in milliseconds
}

export interface TrainingSetFlags {
  isReference: boolean;         // Reference record flag (always true in Phase 0)
  invalidReason?: string;       // Reason for marking as invalid (if any)
}

export interface TrainingSet {
  mode: 'training';                         // Mode (always "training" in Phase 0)
  choiceCount: 8 | 16;                      // Choice count
  filter: TrainingSetFilter;                // Filter criteria
  startedAtClientMs: number;                // Start time (client Date.now())
  submittedAtClientMs: number;              // Submission time (client Date.now())
  submittedAt: Timestamp;                   // Server timestamp
  items: TrainingSetItem[];                 // Results array (max 30 recommended)
  summary: TrainingSetSummary;              // Aggregated stats
  flags: TrainingSetFlags;                  // Flags
}
```

**Anomaly Detection (invalidReason values)**:

| Condition | `invalidReason` | Description |
|-----------|-----------------|-------------|
| `clientElapsedMs < 150ms` | `"反応時間が不自然に短い"` | 人間の反応として不自然（連打疑い） |
| `clientElapsedMs > 120000ms` | `"放置と判定"` | 120秒超（2分超）は放置と判定 |
| 連続同一ms値（例: 10問中8問が同一） | `"計測停止の疑い"` | 計測タイマーが停止している疑い |

**Validation Logic** (Client-side, in `utils/anomalyDetector.ts`):

```typescript
// src/utils/anomalyDetector.ts
export interface AnomalyResult {
  isValid: boolean;
  invalidReason?: string;
}

export function detectAnomalies(items: TrainingSetItem[]): AnomalyResult {
  // Check 1: clientElapsedMs < 150ms
  const tooFast = items.filter(item => item.clientElapsedMs < 150);
  if (tooFast.length > 0) {
    return { isValid: false, invalidReason: '反応時間が不自然に短い' };
  }

  // Check 2: clientElapsedMs > 120000ms
  const abandoned = items.filter(item => item.clientElapsedMs > 120000);
  if (abandoned.length > 0) {
    return { isValid: false, invalidReason: '放置と判定' };
  }

  // Check 3: Consecutive identical ms values (8+ out of 10)
  const msValues = items.map(item => item.clientElapsedMs);
  const counts = new Map<number, number>();
  msValues.forEach(ms => counts.set(ms, (counts.get(ms) || 0) + 1));
  const maxRepeated = Math.max(...counts.values());

  if (items.length >= 10 && maxRepeated >= 8) {
    return { isValid: false, invalidReason: '計測停止の疑い' };
  }

  return { isValid: true };
}
```

**Indexes**:

- **Single-field indexes** (automatic):
  - `submittedAt` (for sorting by submission time)

- **Composite indexes** (if needed):
  - `(flags.isReference, submittedAt)` - for filtering valid records + sorting

**Access Control** (Firestore Security Rules):

```javascript
match /users/{userId}/trainingSets/{setId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Size Constraints**:

- **Items array**: 最大30問推奨（段階1でsubcollection化を検討）
- **Document size**: Firestore最大1MB（30問×各100bytes = 約3KB、余裕あり）

---

## Data Relationships

```text
User (1) ─────────── (*) TrainingSet
  │
  └─ uid (PK)             └─ setId (PK)
                           └─ items[] → Poem (poemId reference)

Poem (100 static documents)
  └─ poemId (PK)
```

**Relationship Rules**:

1. **User ⇔ TrainingSet**: 1対多（1ユーザーが複数のTrainingSetを持つ）
2. **TrainingSet ⇔ Poem**: 多対多（1セットが複数のpoemを参照、1poemが複数セットに登場）
3. **No Foreign Key Enforcement**: Firestoreは外部キー制約なし（クライアント側で整合性保証）

---

## Firestore Security Rules（完全版）

```javascript
// firebase/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Poems collection - public read, admin-only write
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false; // Only via Admin SDK or Console
    }

    // Users collection - owner read/write only
    match /users/{userId} {
      allow read: if isSignedIn() && isOwner(userId);
      allow write: if isSignedIn() && isOwner(userId);

      // TrainingSets subcollection - owner read/write only
      match /trainingSets/{setId} {
        allow read, write: if isSignedIn() && isOwner(userId);
      }
    }
  }
}
```

---

## Data Migration & Seeding

### Poems Seeding

**Script**: `scripts/seed-poems.ts`

```typescript
// scripts/seed-poems.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import poemsData from '../data/poems.seed.json' assert { type: 'json' };

const app = initializeApp({
  credential: cert('./service-account-key.json')
});

const db = getFirestore(app);

async function seedPoems() {
  const batch = db.batch();
  let count = 0;

  for (const poem of poemsData) {
    const ref = db.collection('poems').doc(poem.poemId);
    batch.set(ref, poem, { merge: true }); // Upsert
    count++;
  }

  await batch.commit();
  console.log(`✅ Seeded ${count} poems successfully.`);
}

seedPoems().catch(console.error);
```

**Usage**: `npm run seed:poems`

### User Creation

**Trigger**: First login via Firebase Auth

```typescript
// src/services/auth.service.ts
export async function ensureUserDocument(uid: string, displayName?: string) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid,
      displayName: displayName || null,
      createdAt: serverTimestamp()
    });
  }
}
```

---

## Cost Estimation（Firestore Blaze Plan）

**Assumptions**:
- 100 users in Phase 0
- Each user trains 10 times/week
- Each training set = 10 questions

**Monthly Operations**:

| Operation | Count | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| Poems read (cached) | 100 poems × 1 read/user | Free (cache) | ¥0 |
| TrainingSet write | 100 users × 10 sets/week × 4 weeks | 4,000 writes | ¥0.14 × 4 = ¥0.56 |
| TrainingSet read | 100 users × 10 reads/week × 4 weeks | 4,000 reads | ¥0.04 × 4 = ¥0.16 |
| User doc write | 100 new users | 100 writes | ¥0.01 |
| **Total** | | | **~¥1** |

**Free Tier Coverage**:
- 50K document reads/day（1.5M/month）- 十分カバー
- 20K document writes/day（600K/month）- 十分カバー
- 1 GB storage - 100poems + 4000 trainingSets = ~2MB（十分余裕）

**Conclusion**: 段階0は完全に無料枠内で運用可能。

---

## Future Enhancements (Phase 1+)

- **TrainingSet subcollection化**: itemsが大きくなる場合、`/users/{uid}/trainingSets/{setId}/items/{itemId}`に分割
- **Season/Ranking entities**: 段階1で実装（シーズン管理、番付）
- **User拡張**: displayName以外のプロフィール情報（アバター、段位、称号）
- **Composite indexes**: フィルタ＋ソートの組み合わせ最適化
- **Offline support強化**: IndexedDB Persistenceで完全オフライン対応
