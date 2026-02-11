# Implementation Plan: 掲示板（瓦版・不具合の部屋）

**Branch**: `108-bulletin-board` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)

## Summary

「瓦版」と「不具合の部屋」を持つ掲示板機能を実装する。既存の `siteRole`（admin/uchideshi）を活用し、瓦版は全ユーザー向け告知、不具合の部屋は内弟子・開発者間のクローズドな課題管理とする。

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Firebase SDK 10
**Storage**: Firestore (`board_posts`, `board_comments`)
**Router**: React Router v6
**UI/UX**: タブ切り替え（`Kawaraban` / `BugRoom`）、フィルタリング、ステータスバッジ
**Dependencies**: 106-permission-system (siteRole), 103-group-feature (groupId)

## Milestones

### M1: データモデル・定数実装
- `board_posts` / `board_comments` コレクション設計
- Enum 定義 (`BugStatus`, `BugTargetArea`, `PostType`)
- Firestore Security Rules 実装

### M2: UI・権限実装
- 掲示板レイアウト・タブ制御
- 瓦版リスト・詳細・投稿作成（Admin + Member[Recruit]）
- 不具合リスト・詳細・報告フォーム（Uchideshi/Admin）
- グローバル CTA 「不具合を報告」

### M3: ロジック・制約実装
- `group_recruit` の制約（1団体1件、期限14日、isRecruitmentEnabled）
- 団体設定：瓦版募集許可トグル（owner/organizer）
- ステータス変更権限・ショートカット UI
- フィルタ機能

## Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| 招待コードの直接露出 | `inviteCodeId` のみ保存し、本文には含めない。UI上のボタンでのみ機能させる |
| 不具合報告の乱立・重複 | `targetArea` 選択を必須化し、一覧でのフィルタリングを容易にする |
| 内弟子以外の誤アクセス | Security Rules で厳格に `siteRole` をチェックする |
