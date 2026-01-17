# Research: Phase 0 - Foundation Infrastructure

**Date**: 2026-01-17
**Feature**: Phase 0 - Foundation Infrastructure
**Purpose**: 技術選定とベストプラクティスの調査

## Research Topics

### 1. Vite + React + TypeScript のベストプラクティス

**Decision**: Vite 5 + React 18 + TypeScript 5 を使用

**Rationale**:
- **Vite**: 高速なHMR（Hot Module Replacement）と開発サーバー起動時間により、開発者体験が大幅に向上
- **React 18**: 最新の安定版で、Concurrent Features（useTransition, Suspenseなど）を活用可能（段階1以降で使用予定）
- **TypeScript 5**: 最新の型システムとパフォーマンス改善により、大規模アプリケーションでもビルド時間を短縮

**Best Practices**:
- `tsconfig.json` で `strict: true` を有効化し、型安全性を最大化
- Vite の `import.meta.env.*` を使用して環境変数を読み込む（ `VITE_` プレフィックス必須）
- `vite.config.ts` で alias を設定し、`@/` で `src/` を参照可能にする（ただし段階0では不要）
- React 18 の新しいクライアントレンダリングAPI（`createRoot`）を使用

**Alternatives Considered**:
- **Create React App (CRA)**: 設定が簡単だが、ビルド速度が遅く、カスタマイズが困難
- **Next.js**: SSR/SSGが不要な段階0では過剰（段階2以降でSEO対応時に検討）
- **Webpack**: 設定が複雑で、Viteと比較してビルド速度が遅い

**References**:
- [Vite Official Guide](https://vitejs.dev/guide/)
- [React 18 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

### 2. Firebase Web SDK 10 の Firestore 接続パターン

**Decision**: Firebase Web SDK 10（modular SDK）を使用し、`getFirestore()` でクライアントを初期化

**Rationale**:
- **Modular SDK**: tree-shakingによりバンドルサイズを削減（旧バージョンと比較して最大80%削減）
- **型安全性**: TypeScriptとの統合が改善され、Firestore operationsの型推論が正確
- **環境変数管理**: Viteの `import.meta.env.*` と組み合わせて安全に設定管理

**Best Practices**:
- `src/lib/firebase.ts` でFirebase appとFirestore clientを初期化し、exportする
- `initializeApp()` は一度のみ呼び出す（複数回呼び出すとエラー）
- Firestore操作は `collection()`, `getDocs()`, `query()`, `orderBy()` などのmodular functionsを使用
- エラーハンドリングは `try-catch` でFirebaseErrorをキャッチ

**Implementation Pattern**:
```typescript
// apps/web/src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

**Alternatives Considered**:
- **Firebase Web SDK 9（compat）**: 後方互換性はあるが、バンドルサイズが大きく非推奨
- **Firebase Admin SDK**: サーバーサイド用であり、ブラウザでは使用不可
- **REST API**: 直接Firestore REST APIを呼び出すことも可能だが、SDKの型安全性とエラーハンドリングが失われる

**References**:
- [Firebase Web SDK 10 Documentation](https://firebase.google.com/docs/web/setup)
- [Firestore Get Data Guide](https://firebase.google.com/docs/firestore/query-data/get-data)

---

### 3. Tailwind CSS のレスポンシブデザインパターン

**Decision**: Tailwind CSS 3 を使用し、mobile-firstアプローチでレスポンシブデザインを実装

**Rationale**:
- **Utility-first**: 迅速なプロトタイピングとコンポーネント作成が可能
- **Responsive Utilities**: `sm:`, `md:`, `lg:`, `xl:` などのプレフィックスで簡単にレスポンシブ対応
- **JIT (Just-In-Time) Mode**: 使用されるクラスのみをビルドし、CSSファイルサイズを最小化
- **段階0の要件に適合**: 最小限のUIで良く、デザインシステム構築は不要

**Best Practices**:
- mobile-firstアプローチ: デフォルトはモバイル向けスタイル、`md:` 以上でタブレット・デスクトップ対応
- グリッドレイアウトで poems カードを配置: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- レスポンシブなspacing: `p-4 md:p-6 lg:p-8`

**Card Layout Pattern**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
  {poems.map(poem => (
    <PoemCard key={poem.poemId} poem={poem} />
  ))}
</div>
```

**Alternatives Considered**:
- **CSS Modules**: コンポーネントごとにCSSファイルを作成する必要があり、段階0では過剰
- **Styled Components**: CSS-in-JSはランタイムオーバーヘッドがあり、パフォーマンスが劣る
- **Bootstrap**: デザインが固定的で、カスタマイズが困難

**References**:
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Responsive Design Guide](https://tailwindcss.com/docs/responsive-design)

---

### 4. Firestore Seed スクリプトの実装方法（upsert pattern）

**Decision**: TypeScriptで `scripts/seed_poems.ts` を作成し、`setDoc()` with `{ merge: true }` でupsert

**Rationale**:
- **upsert実現**: `setDoc(docRef, data, { merge: true })` で既存データがあれば上書き、なければ新規作成
- **一括処理**: `Promise.all()` で100件を並列処理し、投入時間を短縮（目標30秒以内）
- **TypeScript使用**: 型安全性を維持し、Poemインターフェースを再利用
- **環境変数**: Web SDKと同じ `.env` ファイルを使用し、設定を一元管理

**Best Practices**:
- `tsx` (TypeScript Execute)を使用してNode.jsでTypeScriptを直接実行
- `data/poems.seed.json` からデータを読み込み、型チェック
- エラーハンドリング: 各poemの投入失敗を個別にログ、全体の成功/失敗をカウント
- ログ出力: 投入開始、進捗、完了時の件数を表示

**Implementation Pattern**:
```typescript
// scripts/seed_poems.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import poemsData from '../data/poems.seed.json';

const firebaseConfig = { /* from .env */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedPoems() {
  console.log('Starting seed: poems...');
  const promises = poemsData.map(poem =>
    setDoc(doc(db, 'poems', poem.poemId), poem, { merge: true })
  );
  await Promise.all(promises);
  console.log(`Seeded ${poemsData.length} poems successfully.`);
}

seedPoems().catch(console.error);
```

**Alternatives Considered**:
- **Firebase Admin SDK**: より強力な権限だが、サービスアカウントキーが必要で管理が複雑
- **Firestore REST API**: 認証が複雑で、SDKの型安全性が失われる
- **Batch Writes**: 500件制限があり、段階0の100件では不要（段階1以降で大量データ投入時に検討）

**References**:
- [Firestore setDoc Documentation](https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document)
- [tsx - TypeScript Execute](https://github.com/privatenumber/tsx)

---

### 5. Firebase Hosting の SPA rewrite 設定

**Decision**: `firebase.json` で `rewrites` ルールを設定し、すべてのURLを `/index.html` にリライト

**Rationale**:
- **SPA対応**: React RouterでクライアントサイドルーティングするSPAでは、すべてのURLを `index.html` に送る必要がある
- **直接URLアクセス対応**: `/basic` に直接アクセスしても404にならず、React Routerがルーティング処理
- **Firebase Hosting標準機能**: 追加の設定や依存関係不要

**Best Practices**:
- `public` ディレクトリを `apps/web/dist` に設定（Viteのビルド出力先）
- `rewrites` で `source: "**"` を設定し、すべてのパスを `/index.html` にリライト
- `ignore` で `firebase.json`, `.*`, `node_modules` を除外
- ビルド前に `npm run build` を実行し、`dist/` ディレクトリを生成

**Configuration**:
```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Alternatives Considered**:
- **404.html redirect**: `/404.html` を用意してリダイレクトする方法もあるが、SEOに悪影響
- **Cloud Functions SSR**: Next.jsのようなSSRは段階0では不要（段階2以降で検討）
- **Vercel/Netlify**: Firebase Hostingと機能的には同等だが、Firebase統合（Firestore, Auth）の観点から Firebase Hosting を選択

**References**:
- [Firebase Hosting Rewrites Documentation](https://firebase.google.com/docs/hosting/full-config#rewrites)
- [SPA Deployment Guide](https://firebase.google.com/docs/hosting/quickstart)

---

## Summary

段階0の技術選定は以下の通り：

| 項目 | 選定技術 | 理由 |
|------|----------|------|
| **Frontend Framework** | React 18 + TypeScript 5 + Vite 5 | 高速な開発体験、型安全性、最新機能 |
| **Styling** | Tailwind CSS 3 | Utility-first、レスポンシブ対応、JIT Mode |
| **Backend** | Firebase Firestore + Hosting | NoSQL、スケーラビリティ、統合された管理コンソール |
| **SDK** | Firebase Web SDK 10 (modular) | バンドルサイズ削減、型安全性 |
| **Seed Script** | TypeScript + tsx | 型安全性、環境変数共有、並列処理 |
| **Deployment** | Firebase Hosting (SPA rewrite) | 直接URLアクセス対応、Firebase統合 |

すべての技術選定は憲法の5原則（Phase-Based Development, Infrastructure-First, Type Safety, Minimal UI, Secure Configuration）に準拠しており、Phase 1 designに進むことができます。
