# Data Model: Phase 0 - Foundation Infrastructure

**Date**: 2026-01-17
**Feature**: Phase 0 - Foundation Infrastructure
**Purpose**: Firestore データモデルとTypeScript型定義の詳細設計

## Overview

段階0では、百人一首の1首を表す `Poem` エンティティのみを扱います。Firestoreの `poems` collectionに100件のドキュメントを保存し、読み取り専用でBasicページに表示します。

## Entities

### Poem（百人一首の1首）

**Description**: 百人一首の1首を表すエンティティ。番号（order）、読札（kami）、取札（shimo）、決まり字数（kimarijiCount）を持つ。

**Firestore Collection**: `poems`

**Document ID**: `poemId`（例: `poem_001`, `poem_002`, ..., `poem_100`）

#### Fields

| Field | Type | Required | Description | Validation | Phase 0 Usage |
|-------|------|----------|-------------|------------|--------------|
| `poemId` | string | Yes | 一意識別子 | パターン: `p\d{3}` (例: `p001`) | ドキュメントIDとして使用 |
| `order` | number | Yes | 百人一首における番号 | 1 ≦ order ≦ 100（整数） | **表示**: order昇順でソート、カードに番号表示 |
| `yomi` | string | Yes | 読札（上の句）の表記 | 非空文字列 | **表示**: カードに上の句を表示 |
| `yomiKana` | string | Yes | 読札（上の句）の読み仮名 | 非空文字列（ひらがな） | **保存のみ**（検索等で使用） |
| `tori` | string | Yes | 取札（下の句）の表記 | 非空文字列 | **保存のみ**（段階1以降で使用） |
| `toriKana` | string | Yes | 取札（下の句）の読み仮名 | 非空文字列（ひらがな） | **保存のみ**（検索等で使用） |
| `kimarijiCount` | number | Yes | 決まり字の数 | 1 ≦ kimarijiCount ≦ 6（整数） | **保存のみ**（段階1以降で使用） |
| `kimariji` | string | Yes | 決まり字 | 非空文字列 | **保存のみ**（表示やハイライトで使用） |
| `author` | string | Yes | 作者名 | 非空文字列 | **保存のみ**（詳細表示で使用） |
| `yomiTokens` | string[] | Yes | 読札のトークン分割配列 | 非空配列 | **保存のみ**（決まり字判定等で使用） |
| `yomiKanaTokens` | string[] | Yes | 読札かなのトークン配列 | 非空配列 | **保存のみ**（読み上げ等で使用） |
| `toriTokens` | string[] | Yes | 取札のトークン分割配列 | 非空配列 | **保存のみ**（表示調整等で使用） |
| `toriKanaTokens` | string[] | Yes | 取札かなのトークン配列 | 非空配列 | **保存のみ**（検索等で使用） |
| `yomiNoSpace` | string | Yes | 読札（空白なし） | 非空文字列 | **保存のみ**（検索等で使用） |
| `yomiKanaNoSpace` | string | Yes | 読札かな（空白なし） | 非空文字列 | **保存のみ**（検索等で使用） |
| `toriNoSpace` | string | Yes | 取札（空白なし） | 非空文字列 | **保存のみ**（検索等で使用） |
| `toriKanaNoSpace` | string | Yes | 取札かな（空白なし） | 非空文字列 | **保存のみ**（検索等で使用） |

#### TypeScript Interface

```typescript
// apps/web/src/types/poem.ts
export interface Poem {
  poemId: string;       // Document ID (例: "p001")
  order: number;        // 1..100
  yomi: string;         // 読札（上の句）
  yomiKana: string;     // 読札読み仮名
  tori: string;         // 取札（下の句）
  toriKana: string;     // 取札読み仮名
  kimarijiCount: number; // 決まり字数 1..6
  kimariji: string;     // 決まり字
  author: string;       // 作者
  yomiTokens: string[];
  yomiKanaTokens: string[];
  toriTokens: string[];
  toriKanaTokens: string[];
  yomiNoSpace: string;
  yomiKanaNoSpace: string;
  toriNoSpace: string;
  toriKanaNoSpace: string;
}
```

#### Firestore Document Example

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

**段階0では追加のインデックス不要**: `order` フィールド昇順での取得は、単一フィールドのソートのためFirestoreの自動インデックスで対応可能。

段階1以降で `kimarijiCount` フィルタリングと `order` ソートを組み合わせる場合、複合インデックスが必要になる可能性あり。

#### Access Patterns

**段階0の読み取りパターン**:
1. **全件取得（order昇順）**:
   ```typescript
   import { collection, query, orderBy, getDocs } from 'firebase/firestore';
   import { db } from '@/lib/firebase';

   const poemsRef = collection(db, 'poems');
   const q = query(poemsRef, orderBy('order', 'asc'));
   const querySnapshot = await getDocs(q);
   const poems: Poem[] = querySnapshot.docs.map(doc => doc.data() as Poem);
   ```

**段階0の書き込みパターン**:
1. **Seed投入（upsert）**:
   ```typescript
   import { doc, setDoc } from 'firebase/firestore';
   import { db } from '@/lib/firebase';

   const poemRef = doc(db, 'poems', poem.poemId);
   await setDoc(poemRef, poem, { merge: true });
   ```

### Data Validation Rules

#### Client-Side Validation (TypeScript)

```typescript
// apps/web/src/types/poem.ts
export function validatePoem(poem: Poem): boolean {
  if (!poem.poemId || !poem.poemId.match(/^poem_\d{3}$/)) {
    return false; // Invalid poemId format
  }
  if (poem.order < 1 || poem.order > 100 || !Number.isInteger(poem.order)) {
    return false; // Invalid order range
  }
  if (!poem.kami || poem.kami.trim().length === 0) {
    return false; // Empty kami
  }
  if (!poem.shimo || poem.shimo.trim().length === 0) {
    return false; // Empty shimo
  }
  if (poem.kimarijiCount < 1 || poem.kimarijiCount > 6 || !Number.isInteger(poem.kimarijiCount)) {
    return false; // Invalid kimarijiCount range
  }
  return true;
}
```

#### Server-Side Validation (Firestore Rules)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /poems/{poemId} {
      allow read: if true; // 全ユーザーが読み取り可能
      allow write: if false; // 書き込み禁止（段階0ではseedのみ）
    }
  }
}
```

**Note**: 段階0では書き込みを禁止しているため、Firestore Rulesでのバリデーションは不要。段階1以降でユーザーによる編集機能を追加する場合、Firestore Rulesに詳細なバリデーションルールを追加する。

## Data Flow

### Seed Flow (Step 4)

```
data/poems.seed.json
    ↓ (read JSON file)
scripts/seed_poems.ts
    ↓ (validate & transform)
Firestore `poems` collection
    ↓ (setDoc with merge: true)
100 documents created/updated
```

### Display Flow (Step 3)

```
User accesses /basic
    ↓
BasicPage component mounts
    ↓
Fetch poems from Firestore
    ↓ (query with orderBy('order', 'asc'))
Firestore returns poems[]
    ↓
Map poems to PoemCard components
    ↓
Render cards on screen (order ascending)
```

### State Management (BasicPage)

```typescript
// apps/web/src/pages/BasicPage.tsx
type LoadingState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

interface State {
  poems: Poem[];
  loadingState: LoadingState;
  error: string | null;
}

// Initial state
const initialState: State = {
  poems: [],
  loadingState: 'idle',
  error: null,
};

// State transitions
idle → loading (on component mount)
loading → success (poems.length > 0)
loading → empty (poems.length === 0)
loading → error (fetch failed)
```

## Edge Cases & Error Handling

### 1. Firestore接続失敗

**Scenario**: ネットワークエラーやFirebase設定エラーにより接続できない

**Handling**:
- `try-catch` でFirebaseErrorをキャッチ
- `loadingState` を `'error'` に設定
- エラーメッセージ「エラー（取得失敗）」を表示

### 2. 不正なデータ構造

**Scenario**: poemsドキュメントに `order` または `kami` フィールドが欠けている

**Handling**:
- クライアントサイドで `validatePoem()` を使用して検証
- 不正なドキュメントはスキップまたはログに警告
- 正常なドキュメントのみを表示

### 3. 空のデータセット

**Scenario**: Firestoreに1件もpoemsが存在しない

**Handling**:
- `poems.length === 0` をチェック
- `loadingState` を `'empty'` に設定
- メッセージ「0件（未投入）」を表示

### 4. 環境変数未設定

**Scenario**: Firebase設定用の環境変数（`.env`）が設定されていない

**Handling**:
- `firebase.ts` で環境変数の存在をチェック
- 未設定の場合は `console.error()` でエラーログ
- アプリケーション起動時にエラーを表示

## Future Extensions (段階1以降)

### 段階1: フィルタリング機能

- `kimarijiCount` によるフィルタリング（1字決まり、2字決まり、...、6字決まり）
- 除外チェック機能（特定のpoemsを一覧から非表示）

**Data Model Impact**:
- `Poem` interface に `excluded: boolean` フィールドを追加（ローカルステート）
- Firestore複合インデックス: `kimarijiCount` + `order`

### 段階2: ユーザー認証と個人設定

- ユーザーごとの除外リスト（Firestore `userSettings` collection）
- お気に入り機能（Firestore `favorites` collection）

**Data Model Impact**:
- 新規collection: `userSettings/{userId}`
- 新規collection: `favorites/{userId}/{poemId}`

### 段階3: 音声・画像対応

- `Poem` interface に `audioUrl: string` フィールドを追加
- `Poem` interface に `imageUrl: string` フィールドを追加（歌人の肖像画など）

**Data Model Impact**:
- Firestore Storage連携（audioファイル、imageファイルのURL管理）

---

## Summary

段階0のデータモデルは `Poem` エンティティのみを扱い、Firestoreの `poems` collectionに100件のドキュメントを保存します。`order` 昇順での読み取りのみを実装し、書き込みはseedスクリプトのみで行います。型安全性を確保するため、TypeScript interfaceとバリデーション関数を提供します。

**Phase 1 Design Ready**: データモデル設計完了、次はAPI contracts（Firestore schema）の詳細化とquickstart.md作成に進みます。
