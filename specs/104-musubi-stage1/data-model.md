# Data Model: 結び（段階1：結び＋集い）

**Branch**: `104-musubi-stage1` | **Date**: 2026-02-07

## Overview

段階1では既存コレクションの構造を変更しない。唯一の変更は `group_events` の `status` フィールドに `rejected` 値を追加すること。

## Existing Entities (変更なし)

### groups/{groupId}

| Field | Type | Description |
|-------|------|-------------|
| groupId | string | 一意識別子（自動生成） |
| name | string | 結び名（1〜50文字、活動中の重複不可） |
| description | string? | 説明（500文字以内） |
| ownerUserId | string | 主宰者のUID |
| status | `active` \| `suspended` \| `deleted` | 結びの状態 |
| memberCount | number | メンバー数 |
| createdAt | Timestamp | 作成日時 |
| updatedAt | Timestamp | 更新日時 |

### group_memberships/{groupId}_{userId}

| Field | Type | Description |
|-------|------|-------------|
| membershipId | string | `{groupId}_{userId}` |
| groupId | string | 結びID |
| userId | string | ユーザーUID |
| role | `owner` \| `organizer` \| `member` | ロール |
| status | `active` \| `left` | メンバーシップ状態 |
| joinedAt | Timestamp | 加入日時 |
| leftAt | Timestamp? | 脱退日時 |

### group_invites/{inviteId}

| Field | Type | Description |
|-------|------|-------------|
| inviteId | string | 一意識別子 |
| groupId | string | 結びID |
| inviteCodeHash | string | `salt:hash` 形式（平文保存禁止） |
| createdAt | Timestamp | 作成日時 |
| expiresAt | Timestamp | 有効期限（デフォルト7日） |
| maxJoins | number | 利用上限（デフォルト100） |
| joinCount | number | 利用回数 |
| revokedAt | Timestamp? | 無効化日時 |
| createdBy | string | 作成者UID |

## Modified Entity

### group_events/{eventId}

| Field | Type | Description | Change |
|-------|------|-------------|--------|
| eventId | string | 一意識別子 | — |
| groupId | string | 結びID | — |
| title | string | 集いタイトル（1〜100文字） | — |
| description | string? | 説明（1000文字以内） | — |
| startAt | Timestamp | 開始日時 | — |
| endAt | Timestamp | 終了日時 | — |
| isOfficial | boolean | 公式フラグ | — |
| visibility | `group_only` \| `public` | 公開範囲 | — |
| status | `draft` \| `published` \| `rejected` \| `closed` | 集いの状態 | **`rejected` 追加** |
| participantCount | number | 参加者数 | — |
| createdBy | string | 作成者UID | — |
| createdAt | Timestamp | 作成日時 | — |
| updatedAt | Timestamp | 更新日時 | — |

## State Transitions

### 集い（Group Event）状態遷移

```
draft ──→ published ──→ closed
  │           │
  │           └──→ draft (unpublish)
  │
  └──→ rejected
```

| From | To | Who | Condition |
|------|----|-----|-----------|
| draft | published | owner, organizer | — |
| published | draft | owner, organizer | unpublish（下書きに戻す） |
| published | closed | owner, organizer | — |
| draft | rejected | owner only | 主宰者のみ却下可能 |

### 可視性ルール

| Status | owner/organizer | member |
|--------|----------------|--------|
| draft | 表示 | 非表示 |
| published | 表示 | 表示 |
| rejected | 表示 | 非表示 |
| closed | 表示 | 表示 |

## Entities NOT Modified (段階1スコープ外)

以下のコレクションは段階1で一切変更しない:

- `sessions/{sessionId}` — 試合記録
- `events/{eventId}` — 個人イベント記録（歌合/検定）
- `rankings/{id}` — ランキング
- `user_progress/{uid}` — ユーザー進捗
- `season_snapshots/{id}` — 季末スナップショット
- `group_stats/{statsId}` — 団体成績（段階2で使用）
- `group_event_participants/{participantId}` — イベント参加者（既存のまま）
