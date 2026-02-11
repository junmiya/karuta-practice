# Research: 105-tebiki-invite

## R-001: 招待コード生成方式

**Decision**: 既存のグループ招待パターン（`functions/src/lib/crypto.ts`）の `generateInviteCode()` を再利用する。inviteIdにはFirestore自動生成ID、inviteCodeには6文字英数字を使用する。

**Rationale**: 既に本番稼働中のセキュリティ実装（SHA-256ハッシュ + ソルト + タイミングセーフ比較）があり、同じパターンを適用することで品質とメンテナンス性が担保される。ただし、グループ招待は12文字のbase64url（`generateInviteCode`の仕様）を使用しているため、手引招待では6文字に短縮する別の生成関数を用意する。

**Alternatives considered**:
- nanoid: 外部依存追加が不要な既存パターンの方が適切
- Firebase Auth Dynamic Links: 廃止予定のため不採用
- UUID短縮: 衝突率の管理が複雑

**Open Question Resolved**: inviteCode は6文字英数字（spec clarification）。衝突チェックをFirestoreクエリで行い、再生成する。英大文字+数字から紛らわしい文字（0/O, 1/I/L）を除外した32文字セットを使用 → 32^6 = 約10億通り。十分な空間。

---

## R-002: 招待の有効期限管理

**Decision**: クライアントサイドで `expiresAt` フィールドを読み取り、現在時刻と比較して期限切れを判定する。サーバサイドのCloud Function（validateInvite）でも同じチェックを行う二重検証方式。

**Rationale**: 既存のグループ招待パターンと同じ。Scheduled Functionによる一括ステータス更新は不要（ドキュメント数が少ないMVPでは読み取り時チェックで十分）。

**Alternatives considered**:
- Scheduled Function で expired に更新: オーバーエンジニアリング（MVPではドキュメント数が少ない）
- TTL Index（Firestoreネイティブ）: Firestoreは自動削除TTLを提供するが、ステータス管理には不向き

---

## R-003: 招待参加時のログインリダイレクト

**Decision**: 招待参加ページ（`/invite/join?id={inviteId}`）で未ログインかつ対象モードがログイン必須の場合、招待IDをURLパラメータに含めたまま `/profile` へリダイレクトし、ログイン後に元のURLへ戻す。

**Rationale**: 既存のGroupJoinPageでは `returnUrl` パラメータを使用してログイン後リダイレクトを実現している。同じパターンを適用する。

**Implementation**:
```
未ログイン + keiko/utaawase招待 → /profile?returnUrl=/invite/join?id={inviteId}
ログイン完了 → /invite/join?id={inviteId} に戻る → 参加処理 → 対象モードへリダイレクト
```

**Alternatives considered**:
- sessionStorageに招待情報を保存: ブラウザ間で共有できない、タブ閉じで消失
- Cookie: 過剰な実装

---

## R-004: 招待リンクのURL構造

**Decision**: `/invite/join?id={inviteId}` を招待リンクURL、手引ページ（`/tebiki`）内の招待セクションにコード入力欄を配置。

**Rationale**:
- リンク経由: `inviteId`（UUID）で直接ドキュメント取得（O(1)）
- コード経由: `inviteCode` フィールドでクエリ検索（インデックス必要）
- 手引ページ内にコード入力欄を置くことで、専用ルートが不要

**URL examples**:
- 招待リンク: `https://karuta-banzuke.web.app/invite/join?id=abc123def456`
- 招待コード入力: `/tebiki` ページ内の「友を誘う」セクション

---

## R-005: 既存コンポーネントの再利用

**Decision**: 手引ページのUIは既存の共通コンポーネント（Card, Button, Heading, Text, Badge）を最大限再利用する。

**Rationale**: 原則25（コンポーネント共通化）に準拠。既存のUIシステムが整っており、新規コンポーネントの追加は最小限で済む。

**再利用コンポーネント**:
- `Card`: セクションの囲み
- `Button`: CTA（一首ためす、友を誘う、招待を作る、参加する）
- `Heading` / `Text`: テキスト表示
- `Badge`: ステータス表示
- `cn()`: スタイルマージユーティリティ

**新規UIは不要**: FAQはアコーディオン不要（最低3項目のシンプル表示）、カード3枚は既存Cardの並列配置で対応。

---

## R-006: Firestoreインデックス

**Decision**: `invites` コレクションに `inviteCode` フィールドの単一フィールドインデックスを追加する。

**Rationale**: コード入力による招待検索（`where('inviteCode', '==', inputCode)`）にインデックスが必要。statusやexpiresAtでのフィルタはクライアントサイドで行う（ドキュメント数が少ないMVP）。

**Note**: グループ招待ではハッシュ化してコード検索していたが、手引招待ではMVP簡略化のため平文コードをFirestoreに保存し、直接クエリで検索する。6文字英数字は推測困難（32^6 ≈ 10億通り）で、ブルートフォース対策はクライアントサイドの試行回数制限で補完する。
