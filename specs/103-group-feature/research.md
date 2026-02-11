# Research: 団体機能

**Feature**: 103-group-feature
**Date**: 2026-02-02

## Research Topics

### 1. 招待コードのセキュリティ設計

**Decision**: SHA-256ハッシュ + ソルト + タイミング安全比較

**Rationale**:
- 招待コードの平文保存は禁止（仕様要件）
- SHA-256はFirebase Cloud Functionsで標準利用可能
- ソルトを付与することでレインボーテーブル攻撃を防止
- タイミング安全比較でタイミング攻撃を防止

**Alternatives considered**:
- bcrypt: パスワード向けで過剰。招待コードは短期有効なので高コストハッシュは不要
- MD5: セキュリティ上推奨されない
- 暗号化（AES）: 復号キー管理が複雑。ハッシュで十分

**Implementation**:
```typescript
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

function generateInviteCode(): { code: string; hash: string } {
  const code = randomBytes(8).toString('base64url'); // 11文字程度
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + code).digest('hex');
  return { code, hash: `${salt}:${hash}` };
}

function verifyInviteCode(code: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const computedHash = createHash('sha256').update(salt + code).digest('hex');
  return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
}
```

---

### 2. QRコード生成ライブラリ選定

**Decision**: qrcode.react（フロントエンド生成）

**Rationale**:
- React対応で実装が簡単
- クライアントサイド生成でサーバ負荷なし
- 招待URLをエンコードするだけなので軽量ライブラリで十分

**Alternatives considered**:
- qrcode（サーバ生成）: Functions呼び出し必要でレイテンシ増加
- qr.js: メンテナンス状況が不明
- カスタム実装: 工数過剰

**Implementation**:
```typescript
import { QRCodeSVG } from 'qrcode.react';

const inviteUrl = `https://karuta-banzuke.web.app/join?groupId=${groupId}&code=${code}`;
<QRCodeSVG value={inviteUrl} size={200} />
```

---

### 3. ロール権限チェックのパターン

**Decision**: Firestore Security Rules + Cloud Functions両方で検証

**Rationale**:
- Security Rulesでクライアント直接書き込みを防止（第一防衛線）
- Cloud Functionsで複雑な権限ロジックを実装（第二防衛線）
- 二重チェックで確実な権限管理

**Alternatives considered**:
- Security Rulesのみ: 複雑なロジック（owner移譲など）は表現困難
- Cloud Functionsのみ: Security Rules無効化が必要でセキュリティリスク

**Implementation Pattern**:
```typescript
// Security Rules
match /groups/{groupId} {
  allow read: if request.auth != null;
  allow write: if false; // サーバのみ
}

match /group_memberships/{membershipId} {
  allow read: if request.auth != null &&
    request.auth.uid == resource.data.userId;
  allow write: if false; // サーバのみ
}

// Cloud Functions
async function checkGroupPermission(
  uid: string,
  groupId: string,
  requiredRoles: GroupRole[]
): Promise<boolean> {
  const membership = await getMembership(uid, groupId);
  if (!membership) return false;
  return requiredRoles.includes(membership.role);
}
```

---

### 4. 競技の団体紐づけ（affiliatedGroupId）凍結タイミング

**Decision**: match.startedAt時点で凍結、以降変更不可

**Rationale**:
- 競技開始時点の所属団体を記録することで、退会・移籍後も過去成績の整合性を維持
- Firestoreのフィールドレベルセキュリティで変更を防止

**Alternatives considered**:
- 競技終了時に設定: 競技中の移籍で紐づけが曖昧になる
- 毎回最新の所属を参照: 過去成績の団体紐づけが変動し整合性が崩れる

**Implementation**:
```typescript
// セッション開始時
const session = {
  ...sessionData,
  affiliatedGroupId: userCurrentGroupId || null, // 開始時点で固定
  startedAt: FieldValue.serverTimestamp(),
};

// Security Rules - affiliatedGroupIdは作成時のみ設定可能
match /sessions/{sessionId} {
  allow update: if !('affiliatedGroupId' in request.resource.data) ||
    request.resource.data.affiliatedGroupId == resource.data.affiliatedGroupId;
}
```

---

### 5. 二重計上防止の集計ロジック

**Decision**: match_logを一次ソースとし、派生ビュー（個人/団体）を生成

**Rationale**:
- 単一の信頼できるソース（match_log）から両方の集計を派生
- 二重カウントの余地がない設計
- 再集計が必要な場合も同一ソースから再計算可能

**Alternatives considered**:
- 個人/団体を別々にカウント: 同期ズレで二重計上リスク
- リアルタイム集計: コスト高、整合性保証が困難

**Implementation**:
```typescript
// 集計処理（Scheduled Function）
async function aggregateGroupStats(groupId: string, seasonKey: string) {
  const matches = await db.collection('sessions')
    .where('affiliatedGroupId', '==', groupId)
    .where('seasonId', '==', seasonKey)
    .where('status', '==', 'confirmed')
    .get();

  // match_logから派生
  const stats = {
    totalMatches: matches.size,
    totalScore: matches.docs.reduce((sum, doc) => sum + doc.data().score, 0),
    // ... 他の集計
  };

  await db.doc(`group_stats/${groupId}_${seasonKey}`).set(stats);
}
```

---

### 6. 団体タブのUI配置

**Decision**: プロフィールタブ内のサブセクションとして実装

**Rationale**:
- 憲法原則20のタブ構成（手習/稽古/歌合/歌位）を維持
- プロフィールページに「所属団体」セクションを追加
- 団体詳細は別ページとしてルーティング

**Alternatives considered**:
- メインタブに「団体」追加: 憲法違反、タブ数増加でUI複雑化
- 完全独立ページ: 導線が分かりにくい

**Implementation**:
```typescript
// ProfilePage.tsx内
<Section title="所属団体">
  {groups.map(group => (
    <GroupCard
      key={group.id}
      group={group}
      onClick={() => navigate(`/group/${group.id}`)}
    />
  ))}
  <Button onClick={() => navigate('/groups')}>
    団体を探す・作成する
  </Button>
</Section>
```

---

### 7. 監査ログの設計

**Decision**: audit_logsコレクション + 構造化フォーマット

**Rationale**:
- 重要操作（参加、退会、ロール変更、停止など）を追跡可能
- 検索・フィルタリングが容易な構造化データ
- 既存のauditLogsコレクションパターンを踏襲

**Implementation**:
```typescript
interface AuditLog {
  eventId: string;
  eventType: 'group_join' | 'group_leave' | 'role_change' | 'invite_regenerate' | 'group_suspend';
  actorId: string;        // 操作者
  targetId?: string;      // 対象者（ある場合）
  groupId: string;
  details: Record<string, any>;
  timestamp: Timestamp;
}

async function writeGroupAuditLog(log: Omit<AuditLog, 'eventId' | 'timestamp'>) {
  await db.collection('audit_logs').add({
    ...log,
    eventId: `group_${Date.now()}_${randomBytes(4).toString('hex')}`,
    timestamp: FieldValue.serverTimestamp(),
  });
}
```

---

## Resolved Clarifications

| Original Question | Resolution |
|-------------------|------------|
| 招待コード保存方式 | SHA-256ハッシュ + ソルト |
| QR生成方式 | クライアントサイド（qrcode.react） |
| 権限チェック方式 | Security Rules + Cloud Functions二重検証 |
| 団体紐づけ凍結タイミング | match.startedAt時点 |
| 集計の信頼できるソース | match_log（sessions）単一ソース |
| 団体タブ配置 | プロフィール内サブセクション |
