# Research: 段階0 12枚固定練習UI・公式競技・番付

**Date**: 2026-01-18
**Branch**: `004-stage0-12card-practice`

## Overview

段階0の実装に必要な技術調査結果をまとめる。憲法v7.0.0で定義された技術スタック（Vite + React + TypeScript + Firebase）を前提とし、Cloud Functions Callable、Firestore設計、12枚UIのベストプラクティスを調査した。

---

## 1. Cloud Functions Callable 設計

### Decision
`submitOfficialSession` を唯一のCallable Functionとして実装する。

### Rationale
- 憲法で「Callable Function 1本のみ」と明記されている
- 公式記録の検証・確定処理はサーバー側で行う必要がある（改ざん防止）
- 冪等性を確保し、再送信時も同一結果を返す

### Implementation Pattern
```typescript
// functions/src/submitOfficialSession.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

export const submitOfficialSession = onCall(async (request) => {
  // 1. 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ログインが必要です');
  }

  // 2. セッション取得と検証
  const { sessionId } = request.data;
  const session = await getSession(sessionId);

  // 3. 冪等性チェック（既にconfirmed/invalidならそのまま返す）
  if (session.status === 'confirmed' || session.status === 'invalid') {
    return { status: session.status, score: session.score };
  }

  // 4. 異常値検出
  const validationResult = await validateSession(session);

  // 5. スコア計算と確定
  if (validationResult.isValid) {
    const score = calculateScore(session);
    await confirmSession(sessionId, score);
    await updateRanking(session.seasonId, session.division, request.auth.uid);
    return { status: 'confirmed', score };
  } else {
    await invalidateSession(sessionId, validationResult.reasons);
    return { status: 'invalid', reasons: validationResult.reasons };
  }
});
```

### Alternatives Considered
1. **HTTP Trigger**: セキュリティ設定が複雑になる。Callableは認証コンテキストが自動で渡される。
2. **Firestore Trigger (onCreate)**: クライアントがsubmissionsに直接書き込む必要があり、セキュリティリスク。

---

## 2. 12枚グリッドUI設計

### Decision
CSS Gridで4列×3行の固定レイアウトを実装。札の縦横比は`aspect-ratio: 52/73`で維持。

### Rationale
- 憲法で「12枚固定」「4×3グリッド」「73:52比率」が明記されている
- CSS Gridは均等配置に最適
- `aspect-ratio`は主要ブラウザでサポート済み（Safari 15+, Chrome 88+）

### Implementation Pattern
```css
/* 4×3グリッド */
.karuta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 0.5rem;
  width: 100%;
  max-width: 100vw;
  padding: 0.5rem;
}

/* 札カード（73:52比率） */
.karuta-card {
  aspect-ratio: 52 / 73;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* レスポンシブ: スマホでも12枚が画面内に収まる */
@media (max-width: 480px) {
  .karuta-grid {
    gap: 0.25rem;
    padding: 0.25rem;
  }
  .karuta-card {
    font-size: 0.75rem;
  }
}
```

### Alternatives Considered
1. **Flexbox**: 均等配置が難しく、行の折り返し制御が煩雑。
2. **固定ピクセル**: レスポンシブ対応が困難。

---

## 3. Firestore コレクション設計

### Decision
憲法で定義されたスキーマに従い、以下のコレクションを使用：

- `seasons/{seasonId}`: シーズン情報
- `entries/{entryId}`: エントリー情報
- `sessions/{sessionId}`: セッション情報
- `sessions/{sessionId}/rounds/{roundIndex}`: ラウンド詳細
- `rankings/{seasonId}_{division}`: 番付キャッシュ
- `userStats/{uid}`: ユーザー統計

### Rationale
- サブコレクション（rounds）を使用することで、セッション単位での取得が効率的
- rankingsはキャッシュドキュメントとして設計し、読み取りコストを削減
- userStatsは個人統計の高速取得用

### Security Rules Pattern
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // seasons: 読み取りのみ許可
    match /seasons/{seasonId} {
      allow read: if true;
      allow write: if false;
    }

    // entries: 本人のみ作成可、更新不可
    match /entries/{entryId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
    }

    // sessions: 本人のみ作成・更新可（確定フィールドを除く）
    match /sessions/{sessionId} {
      allow read: if request.auth != null
                  && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null
                    && resource.data.uid == request.auth.uid
                    && !request.resource.data.keys().hasAny(['score', 'confirmedAt', 'status']);

      // rounds サブコレクション
      match /rounds/{roundIndex} {
        allow read, write: if request.auth != null
                           && get(/databases/$(database)/documents/sessions/$(sessionId)).data.uid == request.auth.uid;
      }
    }

    // rankings: 読み取りのみ許可
    match /rankings/{rankingId} {
      allow read: if true;
      allow write: if false;
    }

    // userStats: 本人のみ読み取り可
    match /userStats/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

### Alternatives Considered
1. **rounds を sessions 内のフィールドに格納**: ドキュメントサイズ制限（1MB）に抵触するリスク。
2. **rankings をクエリで毎回計算**: 読み取りコストが高く、レイテンシ増加。

---

## 4. 異常値検出ロジック

### Decision
憲法で定義された5条件をサーバー側で実装：

1. round数不一致（50未満/重複）
2. 選択肢整合性NG（selectedPoemIdがchoices外）
3. 極端な高速（clientElapsedMs < 200ms が5回以上）
4. 極端な低速（clientElapsedMs > 60000ms が1回でも）
5. 範囲外（correctCountが0〜50外）

### Implementation Pattern
```typescript
interface ValidationResult {
  isValid: boolean;
  reasons: string[];
}

export function validateSession(session: Session, rounds: Round[]): ValidationResult {
  const reasons: string[] = [];

  // 1. round数チェック
  if (rounds.length !== 50) {
    reasons.push('ROUND_COUNT_MISMATCH');
  }
  const indices = new Set(rounds.map(r => r.roundIndex));
  if (indices.size !== 50) {
    reasons.push('ROUND_INDEX_DUPLICATE');
  }

  // 2. 選択肢整合性
  for (const round of rounds) {
    if (!round.choices.includes(round.selectedPoemId)) {
      reasons.push('INVALID_SELECTION');
      break;
    }
  }

  // 3. 極端な高速
  const fastRounds = rounds.filter(r => r.clientElapsedMs < 200);
  if (fastRounds.length >= 5) {
    reasons.push('TOO_FAST');
  }

  // 4. 極端な低速
  const slowRounds = rounds.filter(r => r.clientElapsedMs > 60000);
  if (slowRounds.length >= 1) {
    reasons.push('TOO_SLOW');
  }

  // 5. correctCount範囲
  if (session.correctCount < 0 || session.correctCount > 50) {
    reasons.push('INVALID_CORRECT_COUNT');
  }

  return {
    isValid: reasons.length === 0,
    reasons
  };
}
```

---

## 5. スコア計算

### Decision
憲法で定義された計算式を使用：

```typescript
export function calculateScore(correctCount: number, totalElapsedMs: number): number {
  const tSec = totalElapsedMs / 1000;
  const base = correctCount * 100;
  const speedBonus = Math.round(Math.max(0, 300 - tSec));
  return Math.max(0, base + speedBonus);
}
```

### Rationale
- 正答数×100点を基本とし、速度ボーナスを加算
- 300秒（5分）以内に完了するとボーナス
- 四捨五入で統一（憲法で明記）

---

## 6. 番付更新戦略

### Decision
セッション確定時に即座にrankingsドキュメントを更新する。

### Implementation Pattern
```typescript
export async function updateRanking(
  seasonId: string,
  division: 'kyu' | 'dan',
  uid: string,
  newScore: number
): Promise<void> {
  const rankingId = `${seasonId}_${division}`;
  const rankingRef = db.collection('rankings').doc(rankingId);

  await db.runTransaction(async (transaction) => {
    const rankingDoc = await transaction.get(rankingRef);
    const data = rankingDoc.data() || { entries: [] };

    // ユーザーのエントリを更新または追加
    const existingIndex = data.entries.findIndex(e => e.uid === uid);
    if (existingIndex >= 0) {
      // ベストスコアを更新
      if (newScore > data.entries[existingIndex].score) {
        data.entries[existingIndex].score = newScore;
      }
      data.entries[existingIndex].confirmedSessions++;
    } else {
      // 新規追加
      const user = await getUser(uid);
      data.entries.push({
        uid,
        nickname: user.nickname,
        score: newScore,
        confirmedSessions: 1
      });
    }

    // スコア順にソートして順位付け
    data.entries.sort((a, b) => b.score - a.score);
    data.entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    data.updatedAt = FieldValue.serverTimestamp();
    transaction.set(rankingRef, data);
  });
}
```

### Alternatives Considered
1. **Scheduled Function で定期更新**: リアルタイム性が低下（SC-005: 30秒以内に反映が必要）
2. **クライアント側で集計**: 不正操作のリスク

---

## Summary

| 項目 | Decision | Rationale |
|------|----------|-----------|
| Callable Function | submitOfficialSession 1本 | 憲法準拠、セキュリティ確保 |
| UI Grid | CSS Grid 4×3 | 均等配置、レスポンシブ対応 |
| 札比率 | aspect-ratio: 52/73 | 憲法準拠、ブラウザサポート良好 |
| Firestore | サブコレクション + キャッシュ | 効率的な読み取り、コスト削減 |
| 異常値検出 | 5条件をサーバー側実装 | 憲法準拠、改ざん防止 |
| 番付更新 | 確定時即座更新 | 30秒以内反映の要件を満たす |

全ての技術選定は憲法v7.0.0に準拠しており、NEEDS CLARIFICATIONはなし。
