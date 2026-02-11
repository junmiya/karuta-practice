# Implementation Plan: 課金MVP（Stripe連携）

**Branch**: `107-billing-mvp` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)

## Summary

Stripe Checkout による月額300円サブスクリプション、30日無料トライアル、内弟子QR入口、PAST_DUEソフトロック、マイページ課金表示、団体作成上限制御を実装する。

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: Vite + React 18, Backend: Node.js 20 Cloud Functions)
**Payment**: Stripe Checkout + Webhook（Firebase Extension `firestore-stripe-payments` 活用）
**Storage**: Firestore サブコレクション（`billing/`, `limits/`）
**Dependencies**: 106-permission-system（siteRole 基盤）

## Constitution Check

| 原則 | 状態 | 備考 |
| ---- | ---- | ---- |
| 原則08: Cloud Functions方針 | PASS | Stripe連携・課金操作はすべてCF経由 |
| 原則13: コスト方針 | PASS | Stripe手数料3.6%。billing読取はマイページのみ |
| 原則21: アクセス方針 | PASS | billing/limitsはクライアント書込禁止。Webhook署名検証 |

## Project Structure

### Source Code

```text
apps/web/src/
├── components/
│   └── BillingGuard.tsx            # 課金対象機能のガード（新規）
├── pages/
│   ├── ProfilePage.tsx              # 課金情報セクション追加（既存修正）
│   ├── UchideshiJoinPage.tsx       # 内弟子専用入口ページ（新規）
│   └── EnrollmentPage.tsx          # 入門確認画面（新規）
├── services/
│   └── billing.service.ts          # billing読み取り + Checkout起動（新規）
├── types/
│   └── billing.ts                  # 課金関連型定義（新規）
└── App.tsx                         # ルーティング追加（既存修正）

functions/src/
├── billingFunctions.ts             # ensureBillingOnJoin, createCheckoutSession,
│                                   # createPortalSession, setUchideshiFree,
│                                   # adminGetUserBillingStatuses（新規）
├── stripeWebhook.ts                # Stripe Webhook handler（新規）
├── joinFunctions.ts                # joinAsUchideshi（新規）
├── services/
│   └── groupService.ts             # createGroup に上限チェック追加（既存修正）
└── index.ts                        # 新関数export（既存修正）

apps/web/src/pages/
└── AdminPage.tsx                   # ユーザータブに課金ステータス列追加（既存修正）

firestore.rules                     # billing/limits ルール追加（既存修正）
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Stripe Webhook handler | 決済ステータスの自動同期に必須 | ポーリングは信頼性・コストで劣る |
| サブコレクション方式 | Security Rules分離 | フラットでは課金フィールドの保護が煩雑 |
| クライアント側 PAST_DUE 判定 | Scheduled Function のコスト回避 | TRIAL期限のみの単純判定 |
