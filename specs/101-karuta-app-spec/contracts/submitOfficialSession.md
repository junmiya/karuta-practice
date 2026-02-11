# Contract: submitOfficialSession

**Type**: Firebase Callable Function
**Version**: 1.0.0
**Feature**: 101-karuta-app-spec

---

## 概要

公式競技セッションの提出を受け付け、検証・スコア計算・確定処理を行う。
これは憲法「原則08: Cloud Functions方針」で許可された唯一のCallable Functionである。

---

## エンドポイント

```typescript
// クライアント側呼び出し
const submitOfficialSession = httpsCallable(functions, 'submitOfficialSession');
const result = await submitOfficialSession({ sessionId: 'xxx' });
```

---

## リクエスト

### Input

```typescript
interface SubmitOfficialSessionRequest {
  sessionId: string;  // 提出するセッションのID
}
```

### Validation

| フィールド | ルール |
|-----------|--------|
| sessionId | 必須、文字列、存在するセッションID |

---

## レスポンス

### Success Response

```typescript
interface SubmitOfficialSessionResponse {
  success: true;
  sessionId: string;
  status: 'confirmed' | 'invalid';

  // confirmed時のみ
  score?: number;
  correctCount?: number;
  totalElapsedMs?: number;
  rank?: number;  // 暫定順位（参考値）

  // invalid時のみ
  invalidReasons?: string[];
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}
```

### Error Codes

| Code | Message | 原因 |
|------|---------|------|
| `unauthenticated` | 認証が必要です | 未ログイン |
| `not-found` | セッションが見つかりません | sessionIdが無効 |
| `permission-denied` | このセッションへのアクセス権がありません | 他ユーザーのセッション |
| `failed-precondition` | セッションは提出済みです | status != 'in_progress' |
| `failed-precondition` | セッションの有効期限が切れています | 開始から60分経過 |
| `failed-precondition` | ラウンドが不完全です | 50問未回答 |
| `internal` | サーバーエラー | 予期しないエラー |

---

## 処理フロー

```
1. 認証チェック
   └─ 未認証 → ERROR: unauthenticated

2. セッション取得
   └─ 存在しない → ERROR: not-found

3. 権限チェック
   └─ 他ユーザー → ERROR: permission-denied

4. 状態チェック
   ├─ status != 'in_progress' → ERROR: failed-precondition
   └─ 開始から60分経過 → セッションをexpiredに更新 → ERROR: failed-precondition

5. ラウンド取得（50件）
   └─ 50件未満 → ERROR: failed-precondition

6. 異常検知（Validation）
   ├─ PASS → 7へ
   └─ FAIL → invalidReasonsを設定 → 8へ（invalid処理）

7. スコア計算（confirmed）
   ├─ correctCount = 正解数
   ├─ totalElapsedMs = 合計解答時間
   └─ score = base + speedBonus

8. セッション更新
   ├─ confirmed: status, score, correctCount, totalElapsedMs, confirmedAt
   └─ invalid: status, invalidReasons, confirmedAt

9. userStats更新（confirmed時のみ）

10. レスポンス返却
```

---

## 異常検知ルール

```typescript
interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

function validateSession(rounds: Round[]): ValidationResult {
  const reasons: string[] = [];

  // 1. round数チェック
  if (rounds.length !== 50) {
    reasons.push('ROUNDS_MISMATCH: round数が50ではありません');
  }

  // 2. roundIndex重複/欠番チェック
  const indices = rounds.map(r => r.roundIndex).sort((a, b) => a - b);
  const expected = Array.from({ length: 50 }, (_, i) => i);
  if (JSON.stringify(indices) !== JSON.stringify(expected)) {
    reasons.push('ROUNDS_MISMATCH: roundIndexに重複または欠番があります');
  }

  // 3. 選択肢整合性チェック
  for (const round of rounds) {
    if (!round.choices.includes(round.selectedPoemId)) {
      reasons.push(`CHOICE_INTEGRITY: round ${round.roundIndex} の selectedPoemId が choices に含まれていません`);
    }
  }

  // 4. 極端な高速チェック（<200ms が5回以上）
  const tooFast = rounds.filter(r => r.clientElapsedMs < 200);
  if (tooFast.length >= 5) {
    reasons.push(`EXTREME_TIMING: 200ms未満の回答が${tooFast.length}回あります`);
  }

  // 5. 極端な低速チェック（>60000ms が1回でも）
  const tooSlow = rounds.filter(r => r.clientElapsedMs > 60000);
  if (tooSlow.length > 0) {
    reasons.push(`EXTREME_TIMING: 60秒以上の回答が${tooSlow.length}回あります`);
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
```

---

## スコア計算

```typescript
function calculateScore(rounds: Round[]): { score: number; correctCount: number; totalElapsedMs: number } {
  const correctCount = rounds.filter(r => r.isCorrect).length;
  const totalElapsedMs = rounds.reduce((sum, r) => sum + r.clientElapsedMs, 0);

  const tSec = totalElapsedMs / 1000;
  const base = correctCount * 100;
  const speedBonus = Math.round(Math.max(0, 300 - tSec));
  const score = Math.max(0, base + speedBonus);

  return { score, correctCount, totalElapsedMs };
}
```

---

## 更新されるデータ

### Session（confirmed時）

```typescript
{
  status: 'confirmed',
  score: number,
  correctCount: number,
  totalElapsedMs: number,
  confirmedAt: Timestamp.now(),
  dayKeyJst: calculateDayKeyJst(),  // JST "YYYY-MM-DD"
}
```

### Session（invalid時）

```typescript
{
  status: 'invalid',
  invalidReasons: string[],
  confirmedAt: Timestamp.now(),
  dayKeyJst: calculateDayKeyJst(),
}
```

### UserStats（confirmed時）

```typescript
{
  totalSessions: increment(1),
  confirmedSessions: increment(1),
  bestScore: max(current, newScore),
  // byKimarijiCount, byPoem も更新
}
```

---

## セキュリティ考慮事項

1. **認証必須**: Firebase Authで認証されたユーザーのみ呼び出し可能
2. **本人のみ**: 自分のセッションのみ提出可能
3. **一度きり**: in_progress状態のセッションのみ提出可能
4. **サーバー計算**: スコアはサーバー側で計算（クライアント値は信用しない）
5. **タイムアウト**: 60分経過セッションは自動expired

---

## 使用例（クライアント側）

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const submitOfficialSession = httpsCallable(functions, 'submitOfficialSession');

async function submitSession(sessionId: string) {
  try {
    const result = await submitOfficialSession({ sessionId });
    const data = result.data as SubmitOfficialSessionResponse;

    if (data.success) {
      if (data.status === 'confirmed') {
        console.log(`確定！スコア: ${data.score}, 正解: ${data.correctCount}/50`);
      } else {
        console.log(`無効: ${data.invalidReasons?.join(', ')}`);
      }
    }
  } catch (error) {
    // エラーハンドリング
    console.error('提出エラー:', error);
  }
}
```

---

## 関連ドキュメント

- [data-model.md](./data-model.md) - Session, Roundエンティティ定義
- [spec.md](./spec.md) - FR-025, FR-026（異常検知要件）
- [constitution.md](../../.specify/memory/constitution.md) - 原則07, 08
