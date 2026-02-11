---
name: firebase-deployment
description: Firebase Hosting/Functionsへのデプロイ手順とトラブルシューティング
---

# Firebase Deployment Skill

Firebase へのデプロイに関するスキルです。

## 前提条件

```bash
# Firebase CLIがインストールされていること
npm install -g firebase-tools

# ログイン済みであること
firebase login
```

## デプロイ手順

### 1. フロントエンドのみ

```bash
cd apps/web
npm run build
cd ../..
firebase deploy --only hosting
```

### 2. Cloud Functionsのみ

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 3. 全体デプロイ

```bash
firebase deploy
```

## エミュレータでのテスト

```bash
# 全エミュレータ起動
firebase emulators:start

# Functionsのみ
cd functions && npm run serve
```

## トラブルシューティング

### ビルドエラー

```bash
# TypeScriptエラー確認
cd apps/web && npx tsc --noEmit
cd functions && npx tsc --noEmit
```

### デプロイ失敗

1. `firebase login` でログイン状態確認
2. `.firebaserc` でプロジェクトID確認
3. `firebase use <project-id>` でプロジェクト切り替え

### CORS エラー

`firebase.json` の `hosting.rewrites` を確認

## 環境変数

Functions用の環境変数は Firebase Console または CLI で設定:

```bash
firebase functions:config:set admin.uids="uid1,uid2"
```
