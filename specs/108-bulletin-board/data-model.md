# Data Model: 108-bulletin-board

## Collections

### groups/{groupId} (Extension)

既存の `groups` コレクションへの追加フィールド。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `isRecruitmentEnabled` | boolean | No | 瓦版での募集許可フラグ (default false) |

### board_posts/{postId}

掲示板の投稿（瓦版・不具合共通）。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | string | Yes | Document ID |
| `category` | string | Yes | `'kawaraban'` \| `'bugroom'` |
| `type` | string | Yes | Kawaraban: `'external_news'` \| `'system_news'` \| `'group_recruit'`<br>Bug: `'bug_report'` |
| `title` | string | Yes | タイトル (1-80 chars) |
| `body` | string | No | 本文 (0-4000 chars) |
| `createdAt` | Timestamp | Yes | 作成日時 |
| `updatedAt` | Timestamp | Yes | 更新日時 |
| `createdByUserId` | string | Yes | 作成者UID |
| **Kawaraban Fields** | | | |
| `pinned` | boolean | No | ピン留め (default false) |
| `expiresAt` | Timestamp | No | 有効期限 (group_recruit必須) |
| `externalUrl` | string | No | 外部リンクURL |
| `groupId` | string | No | 募集団体ID |
| `inviteCodeId` | string | No | 招待コードID (非公開) |
| **Bug Room Fields** | | | |
| `status` | string | No | `'new'` \| `'need_info'` \| `'confirmed'` \| `'in_progress'` \| `'fixed'` \| `'closed'` |
| `targetArea` | string | No | 対象機能 (Enum参照) |
| `targetPage` | string | No | 対象画面URL/名前 |
| `steps` | string | No | 再現手順 |
| `expected` | string | No | 期待値 |
| `actual` | string | No | 実績値 |
| `envOs` | string | No | OS |
| `envBrowser` | string | No | ブラウザ |
| `envDevice` | string | No | デバイス |
| `frequency` | string | No | `'always'` \| `'sometimes'` \| `'once'` |

**Indexes**:
- `category, updatedAt desc` (基本リスト)
- `category, pinned desc, expiresAt asc, createdAt desc` (瓦版表示順)
- `category, status` (フィルタ用)
- `category, targetArea` (フィルタ用)
- `groupId, expiresAt` (重複募集チェック用)

### board_comments/{commentId}

投稿へのコメント（主に不具合チケット用）。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | string | Yes | Document ID |
| `postId` | string | Yes | 親投稿ID |
| `body` | string | Yes | コメント本文 |
| `createdAt` | Timestamp | Yes | 作成日時 |
| `createdByUserId` | string | Yes | 作成者UID |

**Indexes**:
- `postId, createdAt asc` (コメント表示順)

## Enums

### Bug Target Area

```typescript
export type BugTargetArea =
  | 'basic'          // 基本
  | 'tebiraki'       // 手引（はじめに）
  | 'tenarai'        // 手習
  | 'keiko'          // 稽古
  | 'utaawase'       // 歌合
  | 'musubi'         // 結び
  | 'kawi'           // 歌位/番付
  | 'group'          // 団体
  | 'invite_auth'    // 招待/認証
  | 'billing'        // 課金
  | 'other';         // その他
```

### Bug Status

```typescript
export type BugStatus =
  | 'new'
  | 'need_info'
  | 'confirmed'
  | 'in_progress'
  | 'fixed'
  | 'closed';
```

## Security Rules

```javascript
match /board_posts/{postId} {
  // 瓦版: member以上閲覧可
  allow read: if resource.data.category == 'kawaraban' && request.auth != null;
  
  // 瓦版投稿:
  // 1. developerは全権
  // 2. memberは group_recruit のみ、かつ自団体のメンバーで、団体が募集許可していること
  allow create: if request.resource.data.category == 'kawaraban' && (
    isAdmin() ||
    (
      request.resource.data.type == 'group_recruit' &&
      isGroupMember(request.resource.data.groupId) &&
      getGroup(request.resource.data.groupId).isRecruitmentEnabled == true
    )
  );
  
  allow update, delete: if resource.data.category == 'kawaraban' && (
    isAdmin() ||
    (resource.data.createdByUserId == request.auth.uid) // 本人のみ削除・編集可
  );

  // 不具合: inner/developerのみ閲覧・書き込み
  allow read: if resource.data.category == 'bugroom' && (isUchideshi() || isAdmin());
  allow create: if request.resource.data.category == 'bugroom' && (isUchideshi() || isAdmin());
  allow update: if resource.data.category == 'bugroom' && (
    isAdmin() || // developerは全権
    (isUchideshi() && request.auth.uid == resource.data.createdByUserId && !('status' in request.resource.data)) // 本人はstatus変更不可
  );
}

match /board_comments/{commentId} {
  // 親投稿の閲覧権限に準拠（実装簡略化のため inner/developer 以上とする）
  allow read, write: if isUchideshi() || isAdmin();
}
```

*Note: `isAdmin()` checks `siteRole == 'admin'`, `isUchideshi()` checks `siteRole == 'uchideshi' || 'admin'`.*
