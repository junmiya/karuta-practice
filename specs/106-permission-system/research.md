# Research: 106-permission-system

## R-001: 権限管理方式の選択

**Decision**: Firestore `users/{uid}.siteRole` フィールドに権限を保存する。

**Rationale**: 既存の `users` コレクションを拡張するため、新しいコレクションやインフラ変更が不要。Firestore Security Rules で参照可能（`get()` 関数で他ユーザーのロールも確認可能）。管理者UIからの動的変更にも対応。

**Alternatives considered**:
- **Firebase Custom Claims**: トークンに埋め込むため読み取りコスト0だが、変更後にユーザーが再ログイン必要。Admin SDK の `setCustomUserClaims()` 呼び出しが必要。中期的には検討対象だが、MVPでは Firestore ベースの方がシンプル
- **環境変数 `ADMIN_UIDS`（現行）**: 再デプロイが必要でスケールしない。内弟子等の追加ロールに対応不可
- **専用 `roles` コレクション**: `users` に追加フィールドで十分な現在の規模では過剰

---

## R-002: 移行期間の互換性

**Decision**: 移行期間中は `ADMIN_UIDS` 環境変数と Firestore `siteRole` の両方をチェックする。

**Rationale**: 環境変数にUIDが設定されている場合も admin として認識することで、Firestore に `siteRole: 'admin'` を設定する前でも管理ダッシュボードにアクセス可能。段階的移行を安全に行える。

**Implementation**:
```typescript
export async function isAdmin(uid: string): Promise<boolean> {
  if (process.env.FUNCTIONS_EMULATOR) return true;
  if (ADMIN_UIDS.includes(uid)) return true;  // 移行期間互換
  return (await getSiteRole(uid)) === 'admin';
}
```

**移行完了条件**: Firestore に `siteRole: 'admin'` を設定後、環境変数コードを削除してデプロイ。

---

## R-003: フロントエンドの admin 判定方式

**Decision**: `useAuth` フックのプロファイル読み込み時に `siteRole` も取得し、`AuthContext` 経由で `isAdmin` / `isTester` を提供する。

**Rationale**: 現在の `getUserProfile()` は既に `users/{uid}` ドキュメント全体を読み取っているため、`siteRole` の追加読み取りコストはゼロ。`AuthContext` に追加することで全コンポーネントから参照可能。

**Alternatives considered**:
- **Cloud Function で判定**: フロントエンドから `adminCheckRole()` を呼ぶ方式。追加のネットワークリクエストが発生し、UXが悪化
- **Firebase Custom Claims のトークン読み取り**: `getIdTokenResult()` でクレームを取得。Custom Claims 移行後に検討
- **ルートごとの API チェック**: 各ページ表示時にバックエンドで判定。過剰な通信コスト

**注意**: フロントエンドのガードは UX 目的。セキュリティはバックエンドの `requireAdmin()` が担保。

---

## R-004: Firestore Security Rules での siteRole 保護

**Decision**: `users/{uid}` の write ルールで `siteRole` の変更を禁止する。

**Rationale**: `siteRole` は管理者のみが変更できるべき。Cloud Functions は Admin SDK を使用し Firestore Rules をバイパスするため、バックエンド経由の変更は影響なし。

**Implementation**: `request.resource.data.siteRole != resource.data.siteRole` の差分チェックで、`siteRole` 変更を含むクライアント書き込みを拒否。

**Edge case**: 新規ユーザー作成時（`createUserProfile`）は `siteRole` を含めない → Security Rules に影響なし。

---

## R-005: `adminFunctions.ts`（V1）の安全な削除

**Decision**: V1 を即時削除する。

**Rationale**: `index.ts` で V1 関数は一切 export されていない。コード内でも import されていない。完全に dead code であり、削除リスクはない。

**確認手順**:
1. `grep -r "adminFunctions" functions/src/` で参照がないことを確認
2. `npm run build` で V1 なしでコンパイルが通ることを確認

---

## R-006: `isAdmin` の同期→非同期化の影響

**Decision**: `isAdmin` を同期関数（`boolean`）から非同期関数（`Promise<boolean>`）に変更する。

**Rationale**: Firestore 読み取りが必要なため非同期化は避けられない。V2 の `requireAdmin` を呼び出す全箇所に `await` を追加する必要がある。

**影響範囲**:
- `adminFunctionsV2.ts` 内の全管理関数（約15箇所）で `requireAdmin(context)` → `await requireAdmin(context)`
- `requireAdmin` の戻り値は `string` → `Promise<string>` に変更

**注意**: `adminFunctionsV2.ts` の `requireAdmin` は元々関数内で呼ばれており、関数自体は `async` なので `await` 追加のみで対応可能。
