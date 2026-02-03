# Quickstart: 団体機能

**Feature**: 103-group-feature
**Date**: 2026-02-02

## Overview

団体機能は以下の主要フローで構成されます：

1. **団体作成** - ユーザーが団体を作成し、招待コードを発行
2. **団体参加** - 招待コード/QRで団体に参加
3. **イベント管理** - 団体内イベントの作成・公開・参加
4. **団体戦参加** - 団体を代表して競技に参加

## Quick Start

### 1. 環境セットアップ

```bash
# 依存パッケージ追加（フロントエンド）
cd apps/web
npm install qrcode.react

# 型定義の追加は不要（qrcode.reactは型定義同梱）
```

### 2. Firestoreインデックス追加

`firestore.indexes.json`に以下を追加：

```json
{
  "indexes": [
    {
      "collectionGroup": "group_memberships",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "group_memberships",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "groupId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "group_events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "groupId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "group_stats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "seasonKey", "order": "ASCENDING" },
        { "fieldPath": "totalScore", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 3. Security Rules追加

`firestore.rules`に以下を追加：

```javascript
// 団体関連ルール
match /groups/{groupId} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /group_memberships/{membershipId} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /group_invites/{inviteId} {
  allow read: if false;
  allow write: if false;
}

match /group_events/{eventId} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /group_event_participants/{participantId} {
  allow read: if request.auth != null;
  allow write: if false;
}

match /group_stats/{statsId} {
  allow read: if true;
  allow write: if false;
}
```

### 4. 型定義追加

**apps/web/src/types/group.ts**:

```typescript
export type GroupRole = 'owner' | 'organizer' | 'member';
export type GroupStatus = 'active' | 'suspended' | 'deleted';
export type MembershipStatus = 'active' | 'left';
export type EventStatus = 'draft' | 'published' | 'closed';
export type EventVisibility = 'group_only' | 'public';

export interface Group {
  groupId: string;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerUserId: string;
  status: GroupStatus;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMembership {
  membershipId: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: MembershipStatus;
  joinedAt: Date;
  leftAt?: Date;
}

export interface GroupEvent {
  eventId: string;
  groupId: string;
  title: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  isOfficial: boolean;
  visibility: EventVisibility;
  status: EventStatus;
  participantCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. サービス関数追加

**apps/web/src/services/group.service.ts**:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const createGroup = httpsCallable(functions, 'createGroup');
export const joinGroup = httpsCallable(functions, 'joinGroup');
export const getMyGroups = httpsCallable(functions, 'getMyGroups');
export const regenerateInviteCode = httpsCallable(functions, 'regenerateInviteCode');
// ... 他のAPI
```

### 6. Cloud Functions追加

**functions/src/groupFunctions.ts**の基本構造：

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const db = admin.firestore();

// 招待コード生成
function generateInviteCode(): { code: string; hash: string } {
  const code = randomBytes(8).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + code).digest('hex');
  return { code, hash: `${salt}:${hash}` };
}

// 招待コード検証
function verifyInviteCode(code: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const computedHash = createHash('sha256').update(salt + code).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
}

// 団体作成
export const createGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }
    // 実装...
  });

// 団体参加
export const joinGroup = functions
  .region('asia-northeast1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }
    // 実装...
  });
```

## Key Implementation Notes

### 招待コードセキュリティ

- **平文保存禁止**: 招待コードは生成時のみ平文で返却、保存はハッシュのみ
- **タイミング安全比較**: `timingSafeEqual`を使用してタイミング攻撃を防止
- **ソルト付与**: レインボーテーブル攻撃を防止

### 団体紐づけの凍結

- `affiliatedGroupId`は`startedAt`時点で設定、以降変更不可
- Security Rulesで更新を防止

### 権限チェックパターン

```typescript
async function checkPermission(
  uid: string,
  groupId: string,
  requiredRoles: GroupRole[]
): Promise<boolean> {
  const membershipId = `${groupId}_${uid}`;
  const doc = await db.doc(`group_memberships/${membershipId}`).get();
  if (!doc.exists) return false;
  const data = doc.data()!;
  return data.status === 'active' && requiredRoles.includes(data.role);
}
```

## Testing

### 単体テスト

```typescript
// 招待コード検証のテスト
describe('Invite Code', () => {
  it('should verify valid code', () => {
    const { code, hash } = generateInviteCode();
    expect(verifyInviteCode(code, hash)).toBe(true);
  });

  it('should reject invalid code', () => {
    const { hash } = generateInviteCode();
    expect(verifyInviteCode('wrong-code', hash)).toBe(false);
  });
});
```

### 統合テスト

```typescript
// 団体参加フローのテスト
describe('Group Join Flow', () => {
  it('should join group with valid invite code', async () => {
    // 1. 団体作成
    const createResult = await createGroup({ name: 'Test Group' });

    // 2. 招待コードで参加
    const joinResult = await joinGroup({
      groupId: createResult.data.groupId,
      inviteCode: createResult.data.inviteCode,
    });

    expect(joinResult.data.success).toBe(true);
  });
});
```

## Deployment Checklist

- [ ] Firestoreインデックスをデプロイ: `firebase deploy --only firestore:indexes`
- [ ] Security Rulesをデプロイ: `firebase deploy --only firestore:rules`
- [ ] Cloud Functionsをデプロイ: `firebase deploy --only functions`
- [ ] フロントエンドをデプロイ: `cd apps/web && npm run build && firebase deploy --only hosting`
