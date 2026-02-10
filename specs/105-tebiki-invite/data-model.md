# Data Model: 105-tebiki-invite

## 新規コレクション

### invites/{inviteId}

招待の本体ドキュメント。招待リンクとコードの両方がこのドキュメントを参照する。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `inviteId` | string | Yes | ドキュメントID（Firestore自動生成UUID） |
| `inviteCode` | string | Yes | 6文字英数字（手入力用、ユニーク） |
| `createdByUserId` | string | Yes | 招待作成者のUID |
| `createdAt` | Timestamp | Yes | 作成日時 |
| `expiresAt` | Timestamp | Yes | 有効期限（作成時刻 + 24時間） |
| `status` | string | Yes | `"active"` / `"expired"` / `"revoked"` |
| `targetMode` | string | Yes | `"tenarai"` / `"keiko"` / `"utaawase"` |
| `settings` | map | Yes | 設定オブジェクト（Phase2拡張用） |
| `settings.yomiKana` | boolean | Yes | 読札かな表示（MVPでは常にfalse） |
| `settings.toriKana` | boolean | Yes | 取札かな表示（MVPでは常にfalse） |
| `settings.kimarijiShow` | boolean | Yes | 決まり字表示（MVPでは常にfalse） |
| `settings.kimarijiFilter` | number[] | Yes | 決まり字フィルタ（MVPでは空配列=全札） |
| `settings.poemRange` | string | Yes | 歌番号範囲（MVPでは空文字=全100首） |
| `usageCount` | number | Yes | 使用回数（初期値0） |
| `lastUsedAt` | Timestamp | No | 最終使用日時 |

**インデックス**:
- `inviteCode` (単一フィールド): コード入力による検索用

**バリデーション**:
- `inviteCode`: 6文字、英大文字+数字（0/O/1/I/L除外の32文字セット）
- `targetMode`: `"tenarai"` / `"keiko"` / `"utaawase"` のいずれか
- `status`: `"active"` / `"expired"` / `"revoked"` のいずれか

**状態遷移**:
```
active → expired   (expiresAtを過ぎた場合、読み取り時に判定)
active → revoked   (作成者が無効化した場合、Phase2)
```

---

### invite_participants/{participantId}（任意・Phase2）

招待を利用して参加したユーザーの記録。MVPでは `usageCount` のインクリメントのみで十分。Phase2で参加者一覧表示が必要になった場合に追加。

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `participantId` | string | Yes | ドキュメントID（`{inviteId}_{参加者UID}`） |
| `inviteId` | string | Yes | 招待ID |
| `userId` | string | No | 参加者UID（匿名の場合null） |
| `sessionId` | string | No | 匿名セッションID（ログイン不要モードの場合） |
| `joinedAt` | Timestamp | Yes | 参加日時 |

---

## 既存コレクションの変更

なし。既存コレクション（users, sessions, groups等）への変更は不要。

---

## Firestoreセキュリティルール

```
// invites - 認証済みユーザーはread可能、writeはサーバのみ
match /invites/{inviteId} {
  allow read: if true;  // 未ログインでも招待情報を表示するため
  allow write: if false; // Cloud Functions経由のみ
}

// invite_participants - サーバのみ（Phase2）
match /invite_participants/{participantId} {
  allow read, write: if false;
}
```

**Note**: `invites` のreadは全公開（未ログインユーザーが招待リンクを開いた際に招待情報を表示するため）。ただし、`inviteCode` フィールドが含まれるため、inviteIdを知らないとドキュメントにアクセスできない（UUIDの推測は困難）。コード検索はCloud Function経由で行う。

→ **修正**: セキュリティ強化のため、招待情報の取得もCloud Function経由とし、Firestoreルールは `allow read: if false` に変更する。

```
// invites - SERVER ONLY
match /invites/{inviteId} {
  allow read, write: if false;
}
```

---

## targetMode → URL マッピング（参照）

| targetMode | 開始URL | URLパラメータ例 |
| ---------- | ------- | --------------- |
| `tenarai` | `/practice?{params}` | `?yomiKana=1&toriKana=1` |
| `keiko` | `/practice12?{params}` | `?yomiKana=1&kimariji_show=1` |
| `utaawase` | `/utaawase` | （設定パラメータなし） |

設定からURLパラメータへの変換ロジック:
```
settings.yomiKana === true  → yomiKana=1
settings.toriKana === true  → toriKana=1
settings.kimarijiShow === true → kimariji_show=1
settings.kimarijiFilter.length > 0 → kimariji=1,2,3
settings.poemRange !== '' → range=1-20,21-40
```

MVPではsettingsはすべてデフォルト（false/空）なので、URLパラメータは付与されない。
