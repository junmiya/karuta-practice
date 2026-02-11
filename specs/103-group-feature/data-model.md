# Data Model: 団体機能

**Feature**: 103-group-feature
**Date**: 2026-02-02

## New Collections

### groups/{groupId}

団体の基本情報を管理。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| groupId | string | ✅ | ドキュメントID |
| name | string | ✅ | 団体名（1-50文字） |
| description | string | | 団体説明（最大500文字） |
| iconUrl | string | | アイコン画像URL |
| ownerUserId | string | ✅ | 団体管理者のUID |
| status | string | ✅ | 'active' \| 'suspended' \| 'deleted' |
| memberCount | number | ✅ | メンバー数（キャッシュ） |
| createdAt | Timestamp | ✅ | 作成日時 |
| updatedAt | Timestamp | ✅ | 更新日時 |

**Indexes**:
- `ownerUserId` (単一フィールド)
- `status, createdAt` (複合インデックス)

---

### group_memberships/{membershipId}

ユーザーと団体の紐づけを管理。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| membershipId | string | ✅ | ドキュメントID（`{groupId}_{userId}`） |
| groupId | string | ✅ | 団体ID |
| userId | string | ✅ | ユーザーUID |
| role | string | ✅ | 'owner' \| 'organizer' \| 'member' |
| status | string | ✅ | 'active' \| 'left' |
| joinedAt | Timestamp | ✅ | 参加日時 |
| leftAt | Timestamp | | 退会日時（退会時のみ） |
| inviteCodeUsed | string | | 使用した招待コードハッシュ（監査用） |

**Indexes**:
- `userId, status` (ユーザーの所属団体一覧)
- `groupId, status` (団体のメンバー一覧)
- `groupId, role` (ロール別メンバー一覧)

---

### group_invites/{inviteId}

招待コードを管理。1団体につき有効な招待コードは1つのみ。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| inviteId | string | ✅ | ドキュメントID |
| groupId | string | ✅ | 団体ID |
| inviteCodeHash | string | ✅ | ハッシュ化された招待コード（salt:hash形式） |
| createdAt | Timestamp | ✅ | 作成日時 |
| expiresAt | Timestamp | ✅ | 有効期限（デフォルト: 作成から7日） |
| maxJoins | number | ✅ | 最大参加人数（デフォルト: 100） |
| joinCount | number | ✅ | 現在の参加人数 |
| revokedAt | Timestamp | | 無効化日時（無効化時のみ） |
| createdBy | string | ✅ | 作成者UID |

**Indexes**:
- `groupId, revokedAt` (有効な招待コード検索)

**Validation Rules**:
- `inviteCodeHash`は平文を含まない（salt:hash形式のみ）
- `joinCount <= maxJoins`
- `expiresAt > now()`（有効期限内）

---

### group_events/{eventId}

団体内イベントを管理。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | string | ✅ | ドキュメントID |
| groupId | string | ✅ | 団体ID |
| title | string | ✅ | イベント名（1-100文字） |
| description | string | | イベント説明（最大1000文字） |
| startAt | Timestamp | ✅ | 開始日時 |
| endAt | Timestamp | ✅ | 終了日時 |
| isOfficial | boolean | ✅ | 公式フラグ（デフォルト: false） |
| visibility | string | ✅ | 'group_only' \| 'public'（デフォルト: 'group_only'） |
| status | string | ✅ | 'draft' \| 'published' \| 'closed' |
| participantCount | number | ✅ | 参加者数（キャッシュ） |
| createdBy | string | ✅ | 作成者UID |
| createdAt | Timestamp | ✅ | 作成日時 |
| updatedAt | Timestamp | ✅ | 更新日時 |

**Indexes**:
- `groupId, status` (団体内イベント一覧)
- `groupId, startAt` (日付順イベント一覧)

---

### group_event_participants/{participantId}

イベント参加者を管理。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| participantId | string | ✅ | ドキュメントID（`{eventId}_{userId}`） |
| eventId | string | ✅ | イベントID |
| groupId | string | ✅ | 団体ID |
| userId | string | ✅ | ユーザーUID |
| joinedAt | Timestamp | ✅ | 参加登録日時 |

**Indexes**:
- `eventId` (イベント参加者一覧)
- `userId, groupId` (ユーザーの参加イベント一覧)

---

### group_stats/{statsId}

団体の集計成績を管理。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| statsId | string | ✅ | ドキュメントID（`{groupId}_{seasonKey}`） |
| groupId | string | ✅ | 団体ID |
| seasonKey | string | ✅ | シーズンキー（例: '2026_spring'） |
| totalMatches | number | ✅ | 総競技数 |
| totalScore | number | ✅ | 総スコア |
| avgScore | number | ✅ | 平均スコア |
| topScore | number | ✅ | 最高スコア |
| memberCount | number | ✅ | 参加メンバー数 |
| rank | number | | シーズン内順位（確定後） |
| updatedAt | Timestamp | ✅ | 最終更新日時 |

**Indexes**:
- `seasonKey, totalScore desc` (シーズン内ランキング)

---

## Extended Collections

### sessions/{sessionId} (拡張)

既存のsessionsコレクションに以下のフィールドを追加。

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| affiliatedGroupId | string | | 紐づけ団体ID（開始時点で凍結、immutable） |
| affiliatedGroupName | string | | 紐づけ団体名（スナップショット） |

**注意**: `affiliatedGroupId`は`startedAt`時点で設定され、以降変更不可。

---

## State Transitions

### Group Status

```
active → suspended → active  (運営管理者による停止/解除)
active → deleted             (団体管理者による削除)
suspended → deleted          (運営管理者による削除)
```

### Membership Status

```
active → left                (退会/除名)
```
※ 再参加は新規メンバーシップとして作成

### Event Status

```
draft → published → closed
draft → closed               (未公開のまま終了)
```

### Invite Status

```
[valid] → [expired]          (期限切れ)
[valid] → [revoked]          (無効化)
[valid] → [maxed]            (上限到達)
```

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 団体 - 読み取りは認証済みユーザー、書き込みはサーバのみ
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // メンバーシップ - 自分の所属のみ読み取り可、書き込みはサーバのみ
    match /group_memberships/{membershipId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         exists(/databases/$(database)/documents/group_memberships/$(resource.data.groupId)_$(request.auth.uid)));
      allow write: if false;
    }

    // 招待コード - 書き込みはサーバのみ
    match /group_invites/{inviteId} {
      allow read: if false; // ハッシュ漏洩防止
      allow write: if false;
    }

    // イベント - 団体メンバーのみ読み取り可
    match /group_events/{eventId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/group_memberships/$(resource.data.groupId)_$(request.auth.uid));
      allow write: if false;
    }

    // イベント参加 - サーバのみ
    match /group_event_participants/{participantId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // 団体成績 - 全員読み取り可
    match /group_stats/{statsId} {
      allow read: if true;
      allow write: if false;
    }

    // セッション - affiliatedGroupIdは作成時のみ設定可能
    match /sessions/{sessionId} {
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.uid &&
        (!('affiliatedGroupId' in request.resource.data) ||
         request.resource.data.affiliatedGroupId == resource.data.affiliatedGroupId);
    }
  }
}
```

---

## Validation Summary

| Entity | Validation |
|--------|------------|
| Group name | 1-50文字、空白のみ不可 |
| Group description | 最大500文字 |
| Invite code | 生成時のみ平文、保存はハッシュのみ |
| Invite expiry | 最大30日 |
| Invite maxJoins | 1-1000 |
| Event title | 1-100文字 |
| Event description | 最大1000文字 |
| Event dates | startAt < endAt |
| affiliatedGroupId | 作成時のみ設定可、以降immutable |
