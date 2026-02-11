---
name: security-checklist
description: セキュリティチェックリスト。認証、Firestoreルール、Cloud Functions権限、APIキー管理
---

# Security Checklist Skill

セキュリティ確認のためのスキルです。

## チェック項目一覧

| カテゴリ | 項目 | 優先度 |
|---------|------|--------|
| 認証 | Firebase Auth設定 | 高 |
| Firestore | セキュリティルール | 高 |
| Functions | 管理者権限チェック | 高 |
| API | キー管理 | 高 |
| フロント | XSS対策 | 中 |

---

## 1. 認証セキュリティ

### Firebase Console確認項目

1. **認証プロバイダ**: 必要なもののみ有効化
   - Google: ✅ 有効
   - Email/Password: 状況に応じて

2. **承認済みドメイン**: 本番ドメインのみ登録
   ```
   Firebase Console > Authentication > Settings > Authorized domains
   ```

### コード確認

```typescript
// useAuth.tsx - 認証状態の適切な管理
const { user, loading } = useAuth();
if (!user) {
  // 未認証時の適切なハンドリング
}
```

---

## 2. Firestoreセキュリティルール

**ファイル:** `firestore.rules`

### 必須ルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみ読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 公開データは読み取りのみ
    match /poems/{poemId} {
      allow read: if true;
      allow write: if false; // 管理者のみFunctions経由
    }
    
    // 管理者コレクションはFunctions経由のみ
    match /season_calendars/{year} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### デプロイ前確認

```bash
# ルールのデプロイ
firebase deploy --only firestore:rules

# ルールのテスト（エミュレータ）
firebase emulators:start
# Emulator UI でルールテスト
```

---

## 3. Cloud Functions権限

### 管理者関数の権限チェック

**ファイル:** `functions/src/adminFunctionsV2.ts`

```typescript
// 管理者UIDリスト（環境変数から）
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];

function requireAdmin(context: functions.https.CallableContext): string {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
  const uid = context.auth.uid;
  if (!isAdmin(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  return uid;
}
```

### 確認項目

- [ ] 全管理者関数で `requireAdmin()` を呼び出している
- [ ] `ADMIN_UIDS` 環境変数が本番で正しく設定されている
- [ ] 開発環境でのバイパスが本番では無効化されている

```bash
# 環境変数設定
firebase functions:config:set admin.uids="uid1,uid2,uid3"
```

---

## 4. APIキー管理

### Firebase設定

**ファイル:** `apps/web/src/services/firebase.ts`

```typescript
// 環境変数から読み込み（.envファイル）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};
```

### 確認項目

- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] 本番用APIキーがGitにコミットされていない
- [ ] Firebase Console でAPIキー制限が設定されている
  - アプリ制限（リファラー制限）
  - API制限（使用するAPIのみ許可）

---

## 5. XSS対策

### Reactの自動エスケープ

Reactは `dangerouslySetInnerHTML` を使わない限り自動エスケープ。

### 確認項目

```bash
# dangerouslySetInnerHTMLの使用箇所検索
grep -r "dangerouslySetInnerHTML" apps/web/src/
```

使用している場合:
- [ ] 信頼できるソースからのデータのみ
- [ ] DOMPurify等でサニタイズ

---

## 6. 本番デプロイ前チェックリスト

```markdown
- [ ] Firestoreルールが適切に設定されている
- [ ] 管理者UIDが環境変数で設定されている
- [ ] 開発用バイパスが無効化されている
- [ ] APIキー制限が設定されている
- [ ] 承認済みドメインが正しく設定されている
- [ ] console.log のデバッグ出力が削除されている
- [ ] エラーメッセージに機密情報が含まれていない
```

---

## 7. 監査ログ

**ファイル:** `functions/src/services/auditService.ts`

管理者操作は監査ログに記録:

```typescript
await writeAuditLog({
  eventType: 'ranking_recalculated',
  uid,
  details: { action: 'freeze_season', seasonKey },
});
```

### 確認方法

```bash
# Firestore Console で audit_logs コレクションを確認
```
