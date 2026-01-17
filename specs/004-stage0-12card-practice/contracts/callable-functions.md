# Callable Functions Contract: 段階0

**Date**: 2026-01-18
**Branch**: `004-stage0-12card-practice`

## Overview

憲法v7.0.0に基づき、段階0では**Callable Function 1本のみ**（`submitOfficialSession`）を実装する。

---

## submitOfficialSession

公式競技セッションの結果を提出し、サーバー側で検証・確定する。

### Function Signature

```typescript
export const submitOfficialSession = onCall<SubmitRequest, SubmitResponse>(
  { region: 'asia-northeast1' },
  async (request) => { ... }
);
```

### Request

```typescript
interface SubmitRequest {
  sessionId: string;  // 提出するセッションのID
}
```

### Response

```typescript
interface SubmitResponse {
  status: 'confirmed' | 'invalid' | 'expired' | 'error';
  score?: number;           // confirmed時のみ
  reasons?: string[];       // invalid時のみ
  message?: string;         // error時のみ
}
```

### Authentication

- **Required**: Yes
- request.auth.uid が session.uid と一致する必要がある

### Behavior

#### 1. 認証チェック

```
IF request.auth is null:
  RETURN { status: 'error', message: 'ログインが必要です' }

IF session.uid != request.auth.uid:
  RETURN { status: 'error', message: '権限がありません' }
```

#### 2. 冪等性チェック

```
IF session.status in ['confirmed', 'invalid', 'expired']:
  RETURN { status: session.status, score: session.score, reasons: session.invalidReasons }
```

#### 3. 期限チェック

```
IF (now - session.startedAt) > 60分:
  UPDATE session.status = 'expired'
  RETURN { status: 'expired' }
```

#### 4. 異常値検出

以下の5条件をチェック：

| 条件 | 判定基準 | 無効理由コード |
|------|----------|----------------|
| round数不一致 | rounds.length != 50 | ROUND_COUNT_MISMATCH |
| 重複インデックス | unique(roundIndex) != 50 | ROUND_INDEX_DUPLICATE |
| 選択肢整合性NG | selectedPoemId not in choices | INVALID_SELECTION |
| 極端な高速 | clientElapsedMs < 200ms が5回以上 | TOO_FAST |
| 極端な低速 | clientElapsedMs > 60000ms が1回以上 | TOO_SLOW |
| 範囲外 | correctCount < 0 OR correctCount > 50 | INVALID_CORRECT_COUNT |

```
IF 異常値あり:
  UPDATE session.status = 'invalid', session.invalidReasons = reasons
  RETURN { status: 'invalid', reasons }
```

#### 5. スコア計算

```typescript
const tSec = totalElapsedMs / 1000;
const base = correctCount * 100;
const speedBonus = Math.round(Math.max(0, 300 - tSec));
const score = Math.max(0, base + speedBonus);
```

#### 6. 確定処理

```
UPDATE session:
  - status = 'confirmed'
  - score = calculatedScore
  - confirmedAt = serverTimestamp
  - dayKeyJst = JST日付

UPDATE rankings/{seasonId}_{division}:
  - ユーザーのエントリを追加/更新
  - スコア順にソート
  - 順位を再計算

UPDATE userStats/{uid}:
  - confirmedSessions++
  - bestScore = max(bestScore, score)

RETURN { status: 'confirmed', score }
```

### Error Codes

| status | 意味 | message / reasons |
|--------|------|-------------------|
| confirmed | 正常確定 | score を返す |
| invalid | 異常値検出 | reasons[] を返す |
| expired | 60分経過 | - |
| error | その他エラー | message を返す |

### Example Usage (Client)

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const submitSession = httpsCallable<SubmitRequest, SubmitResponse>(
  functions,
  'submitOfficialSession'
);

async function handleSubmit(sessionId: string) {
  try {
    const result = await submitSession({ sessionId });
    const data = result.data;

    if (data.status === 'confirmed') {
      console.log('確定! スコア:', data.score);
    } else if (data.status === 'invalid') {
      console.log('無効:', data.reasons);
    } else if (data.status === 'expired') {
      console.log('期限切れ');
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}
```

---

## Firestore Operations (within Callable)

### Read Operations

| Collection | Query | Purpose |
|------------|-------|---------|
| sessions/{sessionId} | get | セッション情報取得 |
| sessions/{sessionId}/rounds | list | 全50ラウンド取得 |
| users/{uid} | get | ニックネーム取得（番付用） |
| rankings/{rankingId} | get | 現在の番付取得 |

### Write Operations

| Collection | Operation | Purpose |
|------------|-----------|---------|
| sessions/{sessionId} | update | status, score, confirmedAt 更新 |
| rankings/{rankingId} | set | 番付更新 |
| userStats/{uid} | update | 統計更新 |

### Transaction

番付更新は競合を防ぐためトランザクション内で実行：

```typescript
await db.runTransaction(async (transaction) => {
  // 1. 現在の番付を取得
  const rankingDoc = await transaction.get(rankingRef);

  // 2. エントリを追加/更新
  // 3. スコア順ソート
  // 4. 順位再計算

  // 5. 書き込み
  transaction.set(rankingRef, updatedRanking);
});
```

---

## Rate Limiting

- 同一ユーザーからの呼び出し: 1回/秒（Firebase標準）
- 同一セッションに対する再提出: 冪等性により許可（結果は同一）

---

## Cost Estimation

1セッション提出あたりの Firestore 操作:

| 操作 | 回数 | 説明 |
|------|------|------|
| 読み取り | 53 | session(1) + rounds(50) + user(1) + ranking(1) |
| 書き込み | 3 | session(1) + ranking(1) + userStats(1) |

無料枠（50K reads, 20K writes/日）での想定:
- 1日あたり約900セッション提出まで対応可能
