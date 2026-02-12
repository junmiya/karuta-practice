---
name: karuta-project
description: 百人一首 Web競技サービス（Karuta）プロジェクトの開発ガイド。Firebase/React/TypeScriptを使用したWebアプリの構造、コーディング規約、デプロイ手順を含む。
---

# Karuta Project Development Skill

百人一首 Web競技サービスの開発に関するスキルです。

## プロジェクト構造

```
/
├── apps/web/          # Vite + React フロントエンド
│   ├── src/
│   │   ├── components/  # UIコンポーネント
│   │   ├── pages/       # ページコンポーネント
│   │   ├── services/    # Firebase呼び出し
│   │   ├── hooks/       # カスタムフック
│   │   └── types/       # TypeScript型定義
│   └── package.json
├── functions/         # Firebase Cloud Functions
│   └── src/
│       ├── services/    # ビジネスロジック
│       └── types/       # 共有型定義
└── specs/             # 仕様書・設計ドキュメント
```

## 技術スタック

- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Vanilla CSS（TailwindCSSは使用しない）
- **Backend**: Firebase Cloud Functions (Node.js)
- **Database**: Firestore
- **Auth**: Firebase Authentication (Google)
- **Hosting**: Firebase Hosting

## 開発コマンド

```bash
# フロントエンド開発
cd apps/web && npm run dev

# Cloud Functions開発（エミュレータ）
cd functions && npm run serve

# TypeScriptビルド確認
cd apps/web && npx tsc --noEmit
cd functions && npx tsc --noEmit

# デプロイ
firebase deploy --only hosting
firebase deploy --only functions
```

## コーディング規約

### フロントエンド

1. **ファイル命名**: PascalCaseでコンポーネント、camelCaseでサービス/フック
2. **インポート**: `@/` エイリアスを使用（例: `@/components/ui/Button`）
3. **コンポーネント**: 関数コンポーネント + フック
4. **状態管理**: React Context + useState/useReducer

### バックエンド

1. **関数命名**: camelCase（例: `adminGetRuleset`）
2. **サービス分離**: `services/` にビジネスロジックを分離
3. **エラーハンドリング**: `HttpsError` を使用
4. **認証**: `requireAdmin()` で管理者権限チェック

## 主要機能

### 公式歌合（Entry/Official）
- シーズンエントリー
- 対戦・スコア記録
- ランキング

### 管理者機能（Admin）
- 節気カレンダー管理
- ルールセット管理
- 確定パイプライン（freeze → finalize → publish）

### 級位認定（Kyui Exam）
- 決まり字問題
- 自動採点
