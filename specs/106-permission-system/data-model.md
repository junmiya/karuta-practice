# Data Model: 106-permission-system

## 既存コレクションの変更

### users/{uid}

User ドキュメントに `siteRole` フィールドを追加。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `uid` | string | Yes | ドキュメントID（Firebase Auth UID） |
| `nickname` | string | Yes | 表示名 |
| `banzukeConsent` | boolean | Yes | 番付表示の同意 |
| **`siteRole`** | **string** | **No** | **`"admin"` / `"tester"` / `"user"` / `"banned"`。未設定は `"user"` 扱い** |
| `createdAt` | Timestamp | Yes | 作成日時 |
| `updatedAt` | Timestamp | Yes | 更新日時 |

**バリデーション**:
- `siteRole`: `"admin"` / `"tester"` / `"user"` / `"banned"` のいずれか、または未設定

**書き込み権限**:
- `siteRole` の変更は**サーバサイド（Admin SDK）のみ**許可
- クライアントからの直接書き込みは Firestore Security Rules で禁止

---

## 新規コレクション

なし。既存の `users` コレクションにフィールドを追加するのみ。

---

## 2層権限モデル

### 第1層: SiteRole（グローバル）

`users/{uid}.siteRole` に保存。ユーザー全体の権限レベルを定義。

| SiteRole | 説明 | 管理ダッシュボード | ベータ機能 | 通常機能 |
| -------- | ---- | :----------------: | :--------: | :------: |
| `admin` | システム管理者 | ✅ | ✅ | ✅ |
| `tester` | テスター | ❌ | ✅ | ✅ |
| `user` | 一般（デフォルト） | ❌ | ❌ | ✅ |
| `banned` | 禁止（将来用） | ❌ | ❌ | ❌ |

### 第2層: GroupRole（団体スコープ）

`group_memberships/{groupId}_{uid}.role` に保存。変更なし。

| GroupRole | 説明 |
| --------- | ---- |
| `owner` | 団体の全管理 |
| `organizer` | イベント管理・招待 |
| `member` | イベント参加 |

**2層の関係**: SiteRole と GroupRole は独立。admin は `adminFunctionsV2.ts` の団体管理関数（suspend/resume/delete）で全団体を管理可能だが、団体内の GroupRole を持つ必要はない。

---

## Firestoreセキュリティルール

```diff
 match /users/{uid} {
-  allow read, write: if request.auth != null && request.auth.uid == uid;
+  // 本人は読み取り可 + siteRole 以外の書き込み可
+  allow read: if request.auth != null && request.auth.uid == uid;
+  allow write: if request.auth != null && request.auth.uid == uid
+    && !('siteRole' in request.resource.data
+         && request.resource.data.siteRole != resource.data.siteRole);
 }
```

`siteRole` の変更はバックエンド Cloud Functions（Admin SDK、ルールをバイパス）のみ。

---

## TypeScript型定義

### フロントエンド（apps/web/src/types/user.ts）

```typescript
export type SiteRole = 'admin' | 'tester' | 'user' | 'banned';

export interface User {
  uid: string;
  nickname: string;
  banzukeConsent: boolean;
  siteRole?: SiteRole;  // 未設定は 'user' 扱い
  createdAt: Date;
  updatedAt: Date;
}
```

### バックエンド（functions/src/lib/adminAuth.ts）

```typescript
export type SiteRole = 'admin' | 'tester' | 'user' | 'banned';

export async function getSiteRole(uid: string): Promise<SiteRole>;
export async function isAdmin(uid: string): Promise<boolean>;
export async function requireAdmin(context: CallableContext): Promise<string>;
```

---

## 初期データ設定

管理者の初期設定は Firebase Console から手動で行う:

1. Firestore → `users/{あなたのUID}` を開く
2. `siteRole` フィールドを追加 → 値: `"admin"`

**マイグレーション不要**: 既存ユーザーは `siteRole` 未設定 = `"user"` 扱い。
