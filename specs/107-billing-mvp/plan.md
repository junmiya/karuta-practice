# Implementation Plan: 課金MVP（Stripe連携・内弟子入口・団体上限）

**Branch**: `107-billing-mvp` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/107-billing-mvp/spec.md`

## Summary

月額330円（税込）のStripeサブスクリプション課金、30日無料トライアル、内弟子割（永年無料）QR入口、団体作成上限（maxGroups=2）、管理者による課金ステータス確認・操作機能を実装する。Cloud Functions で Stripe SDK を直接利用し、Checkout Session + Webhook で課金ライフサイクルを完全制御する。

## Technical Context

**Language/Version**: TypeScript 5.x（Frontend: Vite + React 18、Backend: Node.js 20 Cloud Functions）
**Primary Dependencies**: React 18, react-router-dom 6, Firebase Web SDK 10, Tailwind CSS 3, Firebase Admin SDK, Stripe SDK v20.3.1
**Storage**: Firebase Firestore（サブコレクション: `users/{uid}/billing/*`, `users/{uid}/limits/*`, `stripe_events/*`）
**Testing**: `npx tsc --noEmit` + `npx vite build`（型チェック・ビルド検証）、Stripe テストカード手動検証
**Target Platform**: Web（SPA、Firebase Hosting）
**Project Type**: Web application（frontend + Cloud Functions backend）
**Performance Goals**: Checkout Session 生成 < 3秒、Webhook 処理 < 5秒
**Constraints**: Stripe テスト環境のみ（本番申請は別タスク）。Firebase Blaze 無料枠内運用。
**Scale/Scope**: 〜1000 ユーザー想定。同時課金操作は低頻度。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 状態 | 備考 |
|------|------|------|
| 原則08: Cloud Functions方針 | PASS | 段階1以降はCallable本数制限撤廃。8本の新CF追加は適合 |
| 原則13: コスト方針 | PASS | Stripe 手数料3.6%（月330円×ユーザー数）+ Cloud Functions 呼び出し。月1万円内に収まる |
| 原則18: 課金方針 | PASS | 月額自動更新、解約後データ保持、返金なし — 全て適合 |
| 原則20: タブ構成 | PASS | 既存6タブ構成に変更なし。BillingGuard は稽古・歌合タブに適用 |
| 原則21: アクセス方針 | PASS | 手引・手習はログイン不要のまま。BillingGuard は課金対象ページのみ |
| 原則23: サーバ権限 | PASS | billing/limits はクライアント書き込み禁止。全更新はサーバ経由 |
| 原則25: コンポーネント共通化 | PASS | BillingGuard は共通コンポーネント。billing.service.ts は一元管理 |

**Re-check after Phase 1**: 全項目 PASS。新たな違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/107-billing-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── callable-functions.md   # Callable Functions API contracts
│   └── webhook.md              # Stripe Webhook contract
├── tasks.md             # Phase 2 output (/speckit.tasks)
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
apps/web/src/
├── types/
│   └── billing.ts                  # BillingStatus, Subscription, Entitlement 型定義
├── services/
│   ├── billing.service.ts          # Billing 読み取り + Checkout/Portal 呼び出し
│   └── admin-v2.service.ts         # 管理者用: adminSetUchideshiFree, adminSetMaxGroups, adminGetUserBillingStatuses
├── components/
│   └── BillingGuard.tsx            # 課金対象ページガード
├── pages/
│   ├── EnrollmentPage.tsx          # 入門確認画面
│   ├── UchideshiJoinPage.tsx       # 内弟子QR入口
│   ├── ProfilePage.tsx             # 課金情報表示（修正）
│   ├── AdminPage.tsx               # 課金ステータス列・内弟子割トグル（修正）
│   └── App.tsx                     # ルーティング + BillingGuard（修正）

functions/src/
├── billingFunctions.ts             # ensureBilling, Checkout, Portal, setFree, adminSetMaxGroups, adminGetUserBillingStatuses
├── stripeWebhook.ts                # Stripe Webhook handler (HTTP Function)
├── joinFunctions.ts                # joinAsUchideshi
├── groupFunctions.ts               # 団体上限チェック追加（修正）
└── index.ts                        # 新CF export（修正）

firestore.rules                     # billing/limits/stripe_events ルール追加（修正）
```

**Structure Decision**: 既存の Web application 構造（`apps/web/` + `functions/`）を踏襲。新規ファイル8本 + 既存修正7本。

## Complexity Tracking

該当なし。Constitution Check に違反なし。
