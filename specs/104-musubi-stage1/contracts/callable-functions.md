# Callable Functions Contract: 結び（段階1）

**Branch**: `104-musubi-stage1` | **Date**: 2026-02-07

## Overview

段階1では**1つの新規関数のみ**追加。既存の26+関数はそのまま利用する。

## New Function

### rejectEvent

主宰者がdraft状態の集いを却下する。

**Input**:
```typescript
{
  eventId: string;   // 集いID
  groupId: string;   // 結びID
}
```

**Auth**: `requireGroupRole(groupId, 'owner')` — 主宰者のみ

**Validation**:
- eventIdが存在すること
- 対象イベントのgroupIdが一致すること
- 対象イベントのstatusが`draft`であること

**Side Effects**:
- `group_events/{eventId}.status` を `rejected` に更新
- `group_events/{eventId}.updatedAt` を更新
- 監査ログ: `event_reject` を記録

**Output**:
```typescript
{ success: true }
```

**Error Cases**:
- `unauthenticated`: 未認証
- `permission-denied`: 主宰者でない
- `not-found`: 集いが存在しない
- `failed-precondition`: statusがdraftでない

---

## Existing Functions (変更なし、段階1で使用するもの)

### Group Management
| Function | Auth | Description |
|----------|------|-------------|
| createGroup | requireAuth | 結び作成（+owner membership +招待コード） |
| getGroupInfo | requireAuth | 結び情報取得（メンバー/非メンバーで返却内容が異なる） |
| getMyGroups | requireAuth | 自分の結び一覧 |
| deleteGroup | requireGroupRole(owner) | 結び削除（論理削除） |

### Invite Management
| Function | Auth | Description |
|----------|------|-------------|
| joinGroup | requireAuth | 招待コードで参加（ハッシュ検証） |
| getInviteCode | requireGroupRole(owner/organizer) | 現在の招待コード取得 |
| getInviteInfo | requireAuth | 招待コードの公開情報 |
| regenerateInviteCode | requireGroupRole(owner) | コード再生成（旧コード無効化） |
| revokeInviteCode | requireGroupRole(owner) | コード無効化 |

### Member Management
| Function | Auth | Description |
|----------|------|-------------|
| getGroupMembers | requireGroupMember | メンバー一覧 |
| changeRole | requireGroupRole(owner) | ロール変更 |
| removeMember | requireGroupRole(owner) | メンバー除外 |
| leaveGroup | requireGroupMember (not owner) | 脱退 |

### Event (集い) Management
| Function | Auth | Description |
|----------|------|-------------|
| createEvent | requireGroupRole(owner/organizer) | 集い作成（draft状態） |
| updateEvent | requireGroupRole(owner/organizer) | 集い編集 |
| publishEvent | requireGroupRole(owner/organizer) | draft → published |
| unpublishEvent | requireGroupRole(owner/organizer) | published → draft |
| closeEvent | requireGroupRole(owner/organizer) | → closed |
| getGroupEvents | requireGroupMember | 集い一覧 |
| joinEvent | requireGroupMember | 集いに参加 |
| leaveEvent | requireGroupMember | 集いから離脱 |
| getEventParticipants | requireGroupMember | 参加者一覧 |

## Existing Functions (段階1で使用しないもの)

| Function | Reason |
|----------|--------|
| updateGroup | 結びプロフィール編集は段階2 |
| adminSuspendGroup | 管理者機能（段階1スコープ外） |
| adminResumeGroup | 同上 |
| adminDeleteGroup | 同上 |
| adminGetGroupAuditLogs | 同上 |
| adminGetAllGroups | 同上 |
