# Data Model: Phase 0 - Official Banzuke System

**Feature**: Phase 0 - Official Banzuke System
**Branch**: `003-official-banzuke`
**Date**: 2026-01-17

## Overview

This document defines the complete data model for the 百人一首 competitive karuta training platform. All entities are stored in Firebase Firestore with specific access control patterns defined in Security Rules.

---

## Entity Relationship Diagram

```
┌──────────────┐
│    poems     │ (public, read-only)
│  100 poems   │
└──────────────┘

┌──────────────┐         ┌──────────────────┐
│    users     │         │   submissions    │ (function-only writes)
│  {uid}       │◄────────│  {submissionId}  │
│              │  1:N    │                  │
│ - nickname   │         │ - uid (FK)       │
│ - consent    │         │ - score          │
└──────────────┘         │ - official       │
                         │ - dayKeyJst      │
                         └──────────────────┘
```

**Relationships**:
- **User → Submissions**: One user can have many submissions (1:N)
- **Poems**: Standalone collection (no relationships, read-only seed data)

---

## 1. Poem Entity

### Collection Path
`poems/{poemId}`

### Document ID Format
`p001` through `p100` (zero-padded, 3 digits)

### Schema

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `poemId` | string | ✅ | Document ID (p001-p100) | Regex: `^p\d{3}$` |
| `order` | number | ✅ | Position in anthology (1-100) | Integer, range 1-100, unique |
| `yomi` | string | ✅ | 上の句 (reading card text) | Non-empty, max 100 chars |
| `yomiKana` | string | ✅ | Yomi reading in hiragana | Non-empty, max 100 chars |
| `tori` | string | ✅ | 下の句 (taking card text) | Non-empty, max 100 chars, unique |
| `toriKana` | string | ✅ | Tori reading in hiragana | Non-empty, max 100 chars |
| `kimariji` | string | ✅ | 決まり字 (decisive syllables) | Non-empty, max 20 chars |
| `kimarijiCount` | number | ✅ | Number of decisive syllables | Integer, range 1-6 |
| `author` | string | ✅ | Poet name (歌人) | Non-empty, max 50 chars |

### Example Document

```json
{
  "poemId": "p001",
  "order": 1,
  "yomi": "あきのたの　かりほのいほの　とまをあらみ",
  "yomiKana": "あきのたの　かりほのいほの　とまをあらみ",
  "tori": "わがころもでは　つゆにぬれつつ",
  "toriKana": "わがころもでは　つゆにぬれつつ",
  "kimariji": "あきの",
  "kimarijiCount": 3,
  "author": "天智天皇"
}
```

### Access Control (Firestore Rules)

```javascript
match /poems/{poemId} {
  allow read: if true; // Public read access
  allow write: if false; // No client writes (seed script uses Admin SDK)
}
```

### Data Source
- Loaded from `scripts/poems.seed.json`
- Seeded once during initial setup
- Immutable in Phase 0 (no updates needed)

---

## 2. User Entity

### Collection Path
`users/{uid}`

### Document ID Format
Firebase Auth UID (e.g., `abc123xyz456`)

### Schema

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `uid` | string | ✅ | Firebase Auth UID (document ID) | Matches auth.uid |
| `nickname` | string | ✅ | Display name for banzuke | Non-empty, min 1, max 20 chars, no profanity |
| `banzukeConsent` | boolean | ✅ | Consent to appear in public rankings | Must be `true` to submit official records |
| `createdAt` | Timestamp | ✅ | Account creation timestamp | Auto-set on first login |
| `updatedAt` | Timestamp | ✅ | Last profile update timestamp | Auto-updated on nickname change |

### Example Document

```json
{
  "uid": "abc123xyz456",
  "nickname": "カルタ太郎",
  "banzukeConsent": true,
  "createdAt": { "_seconds": 1705478400, "_nanoseconds": 0 },
  "updatedAt": { "_seconds": 1705478400, "_nanoseconds": 0 }
}
```

### Validation Rules

**Client-side** (before Firestore write):
- `nickname`: Trim whitespace, length 1-20 characters, no control characters
- `banzukeConsent`: Must be explicitly `true` (no default)

**Server-side** (Firestore Security Rules):
```javascript
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;

  allow create: if request.auth != null
                && request.auth.uid == uid
                && request.resource.data.keys().hasAll(['nickname', 'banzukeConsent', 'createdAt', 'updatedAt'])
                && request.resource.data.nickname is string
                && request.resource.data.nickname.size() > 0
                && request.resource.data.nickname.size() <= 20
                && request.resource.data.banzukeConsent == true
                && request.resource.data.createdAt is timestamp
                && request.resource.data.updatedAt is timestamp;

  allow update: if request.auth != null
                && request.auth.uid == uid
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nickname', 'updatedAt'])
                && request.resource.data.nickname is string
                && request.resource.data.nickname.size() > 0
                && request.resource.data.nickname.size() <= 20;

  allow delete: if false; // No deletion in Phase 0
}
```

### Lifecycle

1. **Creation**: On first login (Google or anonymous authentication)
   - Client creates document in `/users/{uid}` with `createdAt` and `updatedAt` both set to server timestamp
   - User prompted to set `nickname` and confirm `banzukeConsent` if not already set

2. **Update**: Profile setup or nickname change
   - Client updates `nickname` and sets `updatedAt` to current server timestamp
   - `banzukeConsent` cannot be changed (set once during first login)

3. **Deletion**: Not supported in Phase 0

---

## 3. Submission Entity

### Collection Path
`submissions/{submissionId}`

### Document ID Format
Auto-generated by Firestore (e.g., `abc123xyz456def789`)

### Schema

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `uid` | string | ✅ | Foreign key to users/{uid} | Matches authenticated user |
| `mode` | string | ✅ | Practice mode identifier | Fixed: `"choice8"` in Phase 0 |
| `questionCount` | number | ✅ | Number of questions in session | Fixed: `10` in Phase 0 |
| `correctCount` | number | ✅ | Number of correct answers | Integer, range 0-10 |
| `elapsedMs` | number | ✅ | Total elapsed time in milliseconds | Integer, > 0 |
| `avgMs` | number | ✅ | Average time per question (ms) | Calculated: `elapsedMs / questionCount` |
| `score` | number | ✅ | Calculated score (server-side) | Integer, ≥ 0, calculated by formula |
| `official` | boolean | ✅ | Official record (true) or reference (false) | Set by anomaly detection |
| `invalidReasons` | string[] | ✅ | Reasons for official=false | Empty if official=true, non-empty if official=false |
| `dayKeyJst` | string | ✅ | JST date key for daily rankings | Format: `YYYY-MM-DD`, server-calculated |
| `serverSubmittedAt` | Timestamp | ✅ | Server timestamp of submission | Auto-set by server (FieldValue.serverTimestamp()) |

### Example Documents

**Official Record**:
```json
{
  "uid": "abc123xyz456",
  "mode": "choice8",
  "questionCount": 10,
  "correctCount": 8,
  "elapsedMs": 24500,
  "avgMs": 2450,
  "score": 1075,
  "official": true,
  "invalidReasons": [],
  "dayKeyJst": "2026-01-17",
  "serverSubmittedAt": { "_seconds": 1705478400, "_nanoseconds": 0 }
}
```

**Reference Record** (anomaly detected):
```json
{
  "uid": "def456uvw789",
  "mode": "choice8",
  "questionCount": 10,
  "correctCount": 10,
  "elapsedMs": 1200,
  "avgMs": 120,
  "score": 1298,
  "official": false,
  "invalidReasons": ["elapsed time too short (< 2000ms)"],
  "dayKeyJst": "2026-01-17",
  "serverSubmittedAt": { "_seconds": 1705478500, "_nanoseconds": 0 }
}
```

### Score Calculation (Server-Side)

**Formula** (from constitution):
```typescript
const tSec = elapsedMs / 1000;
const base = correctCount * 100;
const speedBonus = Math.round(Math.max(0, 300 - tSec));
const score = Math.max(0, base + speedBonus);
```

**Examples**:
| correctCount | elapsedMs | tSec | base | speedBonus | score |
|--------------|-----------|------|------|------------|-------|
| 10 | 20000 (20s) | 20 | 1000 | 280 | 1280 |
| 8 | 24500 (24.5s) | 24.5 | 800 | 275 | 1075 |
| 5 | 60000 (60s) | 60 | 500 | 240 | 740 |
| 10 | 300000 (5min) | 300 | 1000 | 0 | 1000 |
| 10 | 1200 (1.2s - anomaly) | 1.2 | 1000 | 298 | 1298 (invalid) |

### Anomaly Detection (Server-Side)

**Rules** (from constitution):
1. **Rule A**: `elapsedMs < 2000` → official=false, invalidReasons=["elapsed time too short (< 2000ms)"]
2. **Rule B**: `correctCount < 0` OR `correctCount > questionCount` → official=false, invalidReasons=["correctCount out of range"]
3. **Rule C**: `questionCount != 10` → official=false, invalidReasons=["questionCount must be 10 in Phase 0"]

**Logic**:
```typescript
function validateSubmission(payload: SubmitPayload): { official: boolean; invalidReasons: string[] } {
  const invalidReasons: string[] = [];

  if (payload.elapsedMs < 2000) {
    invalidReasons.push("elapsed time too short (< 2000ms)");
  }

  if (payload.correctCount < 0 || payload.correctCount > payload.questionCount) {
    invalidReasons.push("correctCount out of range");
  }

  if (payload.questionCount !== 10) {
    invalidReasons.push("questionCount must be 10 in Phase 0");
  }

  return {
    official: invalidReasons.length === 0,
    invalidReasons
  };
}
```

### Access Control (Firestore Rules)

```javascript
match /submissions/{submissionId} {
  // Users can read their own submissions
  allow read: if request.auth != null && resource.data.uid == request.auth.uid;

  // Only Cloud Functions can write (all client writes blocked)
  allow write: if false;
}
```

**Why Function-Only Writes**:
- Prevents client from tampering with `score`, `official`, `dayKeyJst`, or `serverSubmittedAt`
- Ensures server-side validation and anomaly detection cannot be bypassed
- Cloud Functions use Admin SDK which bypasses Security Rules

### Lifecycle

1. **Creation**: User clicks "公式提出" after completing practice session
   - Client calls `submitOfficialRecord` Callable Function with payload: `{ questionCount, correctCount, elapsedMs }`
   - Server validates payload, calculates score, detects anomalies, calculates dayKeyJst
   - Server creates document in `/submissions/{auto-id}` using Admin SDK
   - Server returns response: `{ success, official, score, invalidReasons, submissionId }`

2. **Reads**: User queries own submissions for history, banzuke queries official submissions for rankings

3. **Updates/Deletes**: Not supported in Phase 0 (submissions are immutable)

---

## 4. Derived Data (Banzuke Rankings)

**Not a separate collection** - Rankings are computed on-the-fly via Firestore query.

### Query Pattern

```typescript
const today = getCurrentJstDate(); // "2026-01-17"

const banzukeQuery = query(
  collection(db, 'submissions'),
  where('dayKeyJst', '==', today),
  where('official', '==', true),
  orderBy('score', 'desc'),
  orderBy('serverSubmittedAt', 'asc'),
  limit(100)
);

const snapshot = await getDocs(banzukeQuery);
```

### Ranking Calculation

**Rank Determination**:
1. Primary sort: `score` descending (higher score = higher rank)
2. Tiebreaker: `serverSubmittedAt` ascending (earlier submission wins tie)
3. Rank = 1-indexed position in sorted results

**Example**:
| Rank | Nickname | Score | SubmittedAt |
|------|----------|-------|-------------|
| 1 | カルタ太郎 | 1280 | 2026-01-17 09:00:00 |
| 2 | 歌仙 | 1280 | 2026-01-17 09:15:00 | (same score, later submission) |
| 3 | 競技者A | 1075 | 2026-01-17 10:30:00 |

### Displayed Data

Client joins with `users/{uid}` to get nickname:

```typescript
const rankings = await Promise.all(
  snapshot.docs.map(async (doc, index) => {
    const submission = doc.data();
    const userDoc = await getDoc(doc(db, 'users', submission.uid));
    const user = userDoc.data();

    return {
      rank: index + 1,
      nickname: user?.nickname || '(不明)',
      score: submission.score,
      correctCount: submission.correctCount,
      avgMs: submission.avgMs
    };
  })
);
```

---

## 5. Firestore Indexes

### Required Composite Index

**Collection**: `submissions`

**Fields**:
1. `dayKeyJst` (ascending)
2. `official` (ascending)
3. `score` (descending)
4. `serverSubmittedAt` (ascending)

**Configuration** (`firestore.indexes.json`):
```json
{
  "indexes": [
    {
      "collectionGroup": "submissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dayKeyJst", "order": "ASCENDING" },
        { "fieldPath": "official", "order": "ASCENDING" },
        { "fieldPath": "score", "order": "DESCENDING" },
        { "fieldPath": "serverSubmittedAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Why This Index**:
- Supports banzuke query filtering by `dayKeyJst` and `official`
- Enables sorting by `score` (descending) with `serverSubmittedAt` tiebreaker
- Without this index, query would fail with "index required" error

---

## 6. Data Seeding

### Poems Collection

**Source**: `scripts/poems.seed.json`

**Format**:
```json
[
  {
    "poemId": "p001",
    "order": 1,
    "yomi": "あきのたの　かりほのいほの　とまをあらみ",
    "yomiKana": "あきのたの　かりほのいほの　とまをあらみ",
    "tori": "わがころもでは　つゆにぬれつつ",
    "toriKana": "わがころもでは　つゆにぬれつつ",
    "kimariji": "あきの",
    "kimarijiCount": 3,
    "author": "天智天皇"
  },
  ...
]
```

**Seed Script** (`scripts/seed-poems.ts`):
```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as poemsData from './poems.seed.json';

const serviceAccount = require('./service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seedPoems() {
  const batch = db.batch();

  for (const poem of poemsData) {
    const docRef = db.collection('poems').doc(poem.poemId);
    batch.set(docRef, poem);
  }

  await batch.commit();
  console.log(`✅ Seeded ${poemsData.length} poems successfully.`);
}

seedPoems().catch(console.error);
```

**Execution**:
```bash
npm run seed:poems
```

**Validation**:
- Check 100 poems exist in Firestore console
- Verify `order` values are unique (1-100)
- Verify `tori` values are unique (for choice generation)

---

## 7. Type Definitions (TypeScript)

### Frontend Types (`apps/web/src/types/`)

```typescript
// poem.ts
export interface Poem {
  poemId: string;
  order: number;
  yomi: string;
  yomiKana: string;
  tori: string;
  toriKana: string;
  kimariji: string;
  kimarijiCount: number;
  author: string;
}

// user.ts
export interface User {
  uid: string;
  nickname: string;
  banzukeConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// submission.ts
export interface Submission {
  uid: string;
  mode: 'choice8';
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
  avgMs: number;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string;
  serverSubmittedAt: Date;
}
```

### Cloud Functions Types (`functions/src/types/`)

```typescript
// submission.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Submission {
  uid: string;
  mode: 'choice8';
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
  avgMs: number;
  score: number;
  official: boolean;
  invalidReasons: string[];
  dayKeyJst: string;
  serverSubmittedAt: Timestamp;
}

export interface SubmitOfficialRecordPayload {
  questionCount: number;
  correctCount: number;
  elapsedMs: number;
}

export interface SubmitOfficialRecordResponse {
  success: boolean;
  official: boolean;
  score: number;
  invalidReasons?: string[];
  submissionId: string;
}
```

---

## Summary

| Entity | Collection Path | Document ID | Access Pattern | Write Access |
|--------|----------------|-------------|----------------|--------------|
| **Poem** | `poems/{poemId}` | `p001`-`p100` | Public read | Seed script only (Admin SDK) |
| **User** | `users/{uid}` | Firebase Auth UID | User-owned (own data) | User (authenticated) |
| **Submission** | `submissions/{submissionId}` | Auto-generated | User read own, public read for banzuke | Cloud Functions only (Admin SDK) |

**Data Integrity Guarantees**:
- ✅ Poems are immutable (seed once, read-only)
- ✅ Users can only modify their own profile
- ✅ Submissions cannot be created/modified by clients (tamper-proof official records)
- ✅ Score, official flag, dayKeyJst calculated server-side only
- ✅ Banzuke rankings computed on-the-fly (no stale data)

**Next Phase**: Generate API contracts (Cloud Functions) and quickstart guide
