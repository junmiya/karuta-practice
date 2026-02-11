# Research: 百人一首競技カルタアプリ

**Feature**: 101-karuta-app-spec
**Date**: 2026-01-18

## 概要

本ドキュメントは、百人一首競技カルタアプリの技術選定と設計決定を記録する。

---

## 決定事項

### 1. フロントエンドフレームワーク

**Decision**: Vite + React 18 + TypeScript
**Rationale**:
- 憲法で規定済み（原則: 技術スタック）
- SPAとして高速な初期ロードとナビゲーション
- コンポーネント共通化が容易（原則25）
- 既存apps/web構造との整合性

**Alternatives considered**:
- Next.js: SSRは不要、SPAで十分。憲法でNext.js不使用を明記。

---

### 2. 状態管理

**Decision**: React Context + カスタムフック
**Rationale**:
- 認証状態（AuthContext）は全タブで共有
- 練習/競技状態はページローカルで十分
- ReduxやZustandは過剰（アプリ規模に対して）

**Alternatives considered**:
- Redux: 複雑性が増す、今回の規模では不要
- Zustand: 軽量だが、Contextで十分対応可能

---

### 3. スタイリング

**Decision**: Tailwind CSS 3
**Rationale**:
- 憲法で規定済み
- ユーティリティファーストで迅速な開発
- レスポンシブ対応が容易（4×3/3×4グリッド切替）
- デザイン参照（アカデミック・スタイル）の「簡潔・余白」と相性良好

**Alternatives considered**:
- CSS Modules: 独自クラス管理が煩雑
- styled-components: ランタイムオーバーヘッド

---

### 4. バックエンド・データベース

**Decision**: Firebase (Auth / Firestore / Cloud Functions / Hosting)
**Rationale**:
- 憲法で規定済み
- サーバーレスでインフラ管理不要
- リアルタイム同期対応（番付更新など）
- コスト予測可能（月1万円上限、原則13）

**Alternatives considered**:
- Supabase: PostgreSQLベースだが、Firestoreの方がドキュメント指向で今回のデータモデルに適合
- 自前サーバー: 運用コスト・管理負荷が増大

---

### 5. 公式セッション確定アーキテクチャ

**Decision**: Callable Function 1本 (submitOfficialSession)
**Rationale**:
- 憲法で規定済み（原則08）
- クライアントからの直接Firestore書き込みを禁止（原則07, 23）
- 検証・スコア計算・番付更新を一箇所で管理
- セキュリティとデータ整合性を担保

**Alternatives considered**:
- REST API (Cloud Run): オーバーヘッド、Callableで十分
- 直接Firestore書き込み + Security Rules: 検証ロジックが複雑になる

---

### 6. 番付キャッシュ戦略

**Decision**: サーバー生成キャッシュ + 3時間更新
**Rationale**:
- クライアント都度集計を禁止（原則13, FR-044）
- Firestore read削減でコスト最適化
- 3時間更新で十分なリアルタイム性

**Collections**:
- `rankings/{seasonId}_{division}`: 暫定ランキング（3時間更新）
- `hallOfFame`: 殿堂（過去シーズン上位3名キャッシュ）

**Alternatives considered**:
- リアルタイム集計: コスト爆発のリスク
- 日次更新: ユーザー体験が劣化

---

### 7. グリッドレイアウト

**Decision**: CSS Media Query (orientation) + CSS Grid
**Rationale**:
- 憲法で規定済み（原則22）
- 横向き=4×3、縦向き=3×4
- orientation media queryで自動切替
- 既存実装（index.css）で対応済み

**Implementation**:
```css
@media (orientation: landscape) {
  .karuta-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (orientation: portrait) {
  .karuta-grid { grid-template-columns: repeat(3, 1fr); }
}
```

---

### 8. 異常検知ルール

**Decision**: 5条件のバリデーション
**Rationale**:
- 憲法で規定済み（異常値判定）
- サーバー側で検証（原則07）

**Conditions**:
1. round数不一致（50未満/重複/欠番）
2. 選択肢整合性NG（selectedがchoices外）
3. 極端な高速（clientElapsedMs < 200ms が5回以上）
4. 極端な低速（clientElapsedMs > 60000ms が1回でも）
5. 範囲外（correctCount 0〜50外）

---

### 9. スコア計算式

**Decision**: base + speedBonus（憲法記載式）
**Rationale**:
- 正確性と速度の両方を評価
- 負のスコアを許容しない（max(0, score)）
- 丸めは四捨五入で統一

**Formula**:
```typescript
const tSec = totalElapsedMs / 1000;
const base = correctCount * 100;
const speedBonus = Math.round(Math.max(0, 300 - tSec));
const score = Math.max(0, base + speedBonus);
```

---

### 10. AI支援戦略（段階0）

**Decision**: ルールベース提案
**Rationale**:
- 段階0では複雑なAI実装を避ける
- 弱い決まり字数/決まり字 → 練習メニュー提案
- 段階1でAI強化を検討

**Implementation**:
- userStats分析 → 苦手な決まり字数を特定
- 簡易ルールで練習提案を生成

---

## 未解決事項

なし。全技術選定は憲法およびユーザー入力で確定済み。

---

## 参考資料

- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
