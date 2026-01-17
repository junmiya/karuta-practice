# Firestore Schema Contract: Phase 0 - Foundation Infrastructure

**Date**: 2026-01-17
**Feature**: Phase 0 - Foundation Infrastructure
**Version**: 1.0.0

## Overview

このドキュメントは段階0で使用するFirestore schemaの詳細を定義します。段階0では `poems` collectionのみを使用し、読み取り専用でアクセスします。

## Collections

### `poems` Collection

**Purpose**: 百人一首の100首を保存する

**Access**: Read-only (write via seed script only)

#### Document Structure

**Collection Path**: `/poems/{poemId}`

**Document ID Format**: `pXXX` (XXX は3桁のゼロパディング数字、例: `p001`, `p002`, ..., `p100`)
 
 #### Schema
 
 ```json
 {
   "poemId": "string",
   "order": "number",
   "yomi": "string",
   "yomiKana": "string",
   "tori": "string",
   "toriKana": "string",
   "kimarijiCount": "number",
   "kimariji": "string",
   "kimariji": "string",
   "author": "string",
   "yomiTokens": ["string"],
   "yomiKanaTokens": ["string"],
   "toriTokens": ["string"],
   "toriKanaTokens": ["string"],
   "yomiNoSpace": "string",
   "yomiKanaNoSpace": "string",
   "toriNoSpace": "string",
   "toriKanaNoSpace": "string"
 }
 ```
 
 #### Field Specifications
 
 | Field | Type | Required | Constraints | Description | Example |
 |-------|------|----------|-------------|-------------|---------|
 | `poemId` | string | Yes | Pattern: `^p\d{3}$`<br>Unique across collection | 一意識別子（ドキュメントIDと同じ） | `"p001"` |
 | `order` | number | Yes | 1 ≦ order ≦ 100<br>Integer<br>Unique across collection | 百人一首における番号 | `1` |
 | `yomi` | string | Yes | Non-empty | 読札（上の句）の表記 | `"秋の田の..."` |
 | `yomiKana` | string | Yes | Non-empty<br>Hiragana | 読札（上の句）の読み仮名 | `"あきのたの..."` |
 | `tori` | string | Yes | Non-empty | 取札（下の句）の表記 | `"わが衣手は..."` |
 | `toriKana` | string | Yes | Non-empty<br>Hiragana | 取札（下の句）の読み仮名 | `"わがころもでは..."` |
 | `kimarijiCount` | number | Yes | 1 ≦ kimarijiCount ≦ 6<br>Integer | 決まり字の数 | `3` |
 | `kimariji` | string | Yes | Non-empty | 決まり字 | `"あきの"` |
 | `author` | string | Yes | Non-empty | 作者名 | `"天智天皇"` |
 | `yomiTokens` | array | Yes | Non-empty array | 読札のトークン分割配列 | `["秋の田の", ...]` |
 | `yomiKanaTokens` | array | Yes | Non-empty array | 読札かなのトークン配列 | `["あきのたの", ...]` |
 | `toriTokens` | array | Yes | Non-empty array | 取札のトークン分割配列 | `["わが衣手は", ...]` |
 | `toriKanaTokens` | array | Yes | Non-empty array | 取札かなのトークン配列 | `["わがころもでは", ...]` |
 | `yomiNoSpace` | string | Yes | Non-empty | 読札（空白なし） | `"秋の田のかりほの.."` |
 | `yomiKanaNoSpace` | string | Yes | Non-empty | 読札かな（空白なし） | `"あきのたのかりほの.."` |
 | `toriNoSpace` | string | Yes | Non-empty | 取札（空白なし） | `"わが衣手は露に.."` |
 | `toriKanaNoSpace` | string | Yes | Non-empty | 取札かな（空白なし） | `"わがころもではつゆに.."` |
 
 #### Example Document
 
 ```json
 {
   "poemId": "p001",
   "order": 1,
   "yomi": "秋の田の かりほの庵の 苫をあらみ",
   "yomiKana": "あきのたの かりほのいおの とまをあらみ",
   "tori": "わが衣手は 露にぬれつつ",
   "toriKana": "わがころもでは つゆにぬれつつ",
   "kimarijiCount": 3,
   "kimariji": "あきの",
   "kimariji": "あきの",
   "author": "天智天皇",
   "yomiTokens": ["秋の田の", "かりほの庵の", "苫をあらみ"],
   "yomiKanaTokens": ["あきのたの", "かりほのいおの", "とまをあらみ"],
   "toriTokens": ["わが衣手は", "露にぬれつつ"],
   "toriKanaTokens": ["わがころもでは", "つゆにぬれつつ"],
   "yomiNoSpace": "秋の田のかりほの庵の苫をあらみ",
   "yomiKanaNoSpace": "あきのたのかりほのいおのとまをあらみ",
   "toriNoSpace": "わが衣手は露にぬれつつ",
   "toriKanaNoSpace": "わがころもではつゆにぬれつつ"
 }
 ```
 
 #### Indexes
 
 **Auto-created Indexes** (Firestore automatic):
 - Single field: `order` (ascending/descending)
 
 **段階0では複合インデックス不要**
 
 **段階1以降で必要になる可能性のある複合インデックス**:
 - `kimarijiCount` (ascending) + `order` (ascending) - フィルタリング＋ソート用

## Query Patterns

### 1. 全件取得（order昇順）

**Use Case**: Basicページでpoemsを一覧表示

**Query**:
```typescript
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const poemsRef = collection(db, 'poems');
const q = query(poemsRef, orderBy('order', 'asc'));
const querySnapshot = await getDocs(q);
```

**Expected Result**: 100件のpoemsがorder昇順で返される

**Performance**: 100件の取得は1回のリクエストで完了、目標3秒以内

### 2. Seed投入（upsert）

**Use Case**: `npm run seed:poems` コマンドでpoemsを投入

**Operation**:
```typescript
import { doc, setDoc } from 'firebase/firestore';

const poemRef = doc(db, 'poems', poemId);
await setDoc(poemRef, poemData, { merge: true });
```

**Behavior**:
- 既存のドキュメントがあれば上書き（upsert）
- なければ新規作成

**Performance**: 100件のupsertを並列実行（`Promise.all()`）、目標30秒以内

## Security Rules

**File**: `firestore.rules`

**段階0のセキュリティルール**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // poems collection: read allowed for all users, write denied
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false;
    }

    // All other collections: deny all access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Rationale**:
- **Read許可**: 段階0では認証なしで全ユーザーがpoemsを閲覧可能
- **Write禁止**: 本番環境でのデータ改ざんを防止（seedスクリプトは開発環境のみで実行）
- **Other Collections拒否**: 将来の拡張に備えて他のcollectionsへのアクセスを明示的に拒否

**段階1以降の拡張**:
- ユーザー認証導入後、`userSettings` collectionへのread/write権限を追加
- 管理者権限（Admin）の導入とpoems collection へのwrite権限付与

## Data Migration Strategy

### Initial Seed (段階0)

1. `data/poems.seed.json` に100件のpoemsを用意
2. `npm run seed:poems` コマンドを実行
3. Firestoreに100件のドキュメントを作成

### Update Strategy (段階1以降)

- **Schema変更**: 新しいフィールドを追加する場合、既存ドキュメントには `setDoc()` with `{ merge: true }` で更新
- **Backward Compatibility**: 既存フィールドの型や制約を変更する場合、移行スクリプトを作成してバッチ更新

## API Contract Validation

### Client-Side Validation

**TypeScript Interface** (`apps/web/src/types/poem.ts`):
```typescript
export interface Poem {
  poemId: string;
  order: number;
  kami: string;
  shimo: string;
  kimarijiCount: number;
}

export function validatePoem(poem: Poem): boolean {
  return (
    /^poem_\d{3}$/.test(poem.poemId) &&
    Number.isInteger(poem.order) &&
    poem.order >= 1 &&
    poem.order <= 100 &&
    poem.kami.trim().length > 0 &&
    poem.shimo.trim().length > 0 &&
    Number.isInteger(poem.kimarijiCount) &&
    poem.kimarijiCount >= 1 &&
    poem.kimarijiCount <= 6
  );
}
```

### Server-Side Validation

段階0では書き込みが禁止されているため、Firestore Rulesでのバリデーションは不要。段階1以降で書き込み許可する際に、Firestore Rulesに詳細なバリデーションを追加。

## Error Handling

### Firestore Errors

| Error Code | Scenario | Handling |
|------------|----------|----------|
| `permission-denied` | Firestore Rulesで拒否された | エラーメッセージ「エラー（取得失敗）」を表示 |
| `unavailable` | ネットワークエラー | エラーメッセージ「エラー（取得失敗）」を表示、リトライ推奨 |
| `not-found` | ドキュメントが存在しない | 空のリストを返す（`loadingState: 'empty'`） |
| `invalid-argument` | クエリパラメータが不正 | エラーメッセージ「エラー（取得失敗）」を表示 |

### Client-Side Error Handling

```typescript
try {
  const querySnapshot = await getDocs(q);
  const poems = querySnapshot.docs.map(doc => doc.data() as Poem);
  setPoems(poems);
  setLoadingState(poems.length > 0 ? 'success' : 'empty');
} catch (error) {
  console.error('Failed to fetch poems:', error);
  setError('エラー（取得失敗）');
  setLoadingState('error');
}
```

## Testing Contract Compliance

### Unit Tests (段階1以降)

```typescript
describe('Poem Schema Validation', () => {
  it('should validate correct poem data', () => {
    const validPoem: Poem = {
      poemId: 'poem_001',
      order: 1,
      kami: '秋の田の かりほの庵の 苫をあらみ',
      shimo: 'わが衣手は 露にぬれつつ',
      kimarijiCount: 3,
    };
    expect(validatePoem(validPoem)).toBe(true);
  });

  it('should reject invalid poemId format', () => {
    const invalidPoem: Poem = {
      poemId: 'invalid',
      order: 1,
      kami: 'test',
      shimo: 'test',
      kimarijiCount: 3,
    };
    expect(validatePoem(invalidPoem)).toBe(false);
  });
});
```

### Integration Tests (段階1以降)

- Firestore Emulatorを使用してSecurity Rulesをテスト
- Seed scriptの動作確認（100件投入、重複upsert）
- Query patternの動作確認（order昇順取得）

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-17 | Initial schema for phase 0 | Claude Sonnet 4.5 |

## Future Versions (段階1以降)

- **v1.1.0**: `kimarijiCount` フィルタリング用の複合インデックス追加
- **v2.0.0**: ユーザー認証導入、`userSettings` collection追加
- **v3.0.0**: 音声・画像対応、`audioUrl`, `imageUrl` フィールド追加
