# Tasks: 結び（段階1：結び＋集い）

**Input**: Design documents from `/specs/104-musubi-stage1/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: テスト自動化は段階1では明示的に要求されていない。手動E2Eテストをquickstart.mdのチェックリストで実施。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/web/src/`
- **Backend**: `functions/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 型定義とバックエンド基盤の変更（全ストーリーの前提）

- [X] T001 [P] EventStatus に `rejected` を追加し、関連ラベル定数を更新する `apps/web/src/types/group.ts`
- [X] T002 [P] EventStatus に `rejected` を追加し、GroupAuditEventType に `event_reject` を追加する `functions/src/types/group.ts`
- [X] T003 groupAuditService に `logEventReject` 関数を追加する `functions/src/services/groupAuditService.ts`
- [X] T004 rejectEvent callable 関数を実装する（owner のみ、draft→rejected 遷移、監査ログ記録） `functions/src/groupFunctions.ts`
- [X] T005 rejectEvent を index.ts にエクスポート追加する `functions/src/index.ts`
- [X] T006 フロントエンドサービスに rejectEvent 呼び出しを追加する `apps/web/src/services/group.service.ts`
- [X] T007 招待コード生成が16文字以上であることを確認し、不足なら修正する `functions/src/services/inviteService.ts`

**Checkpoint**: rejected 状態と rejectEvent API が利用可能。全ストーリーの前提が整う。

---

## Phase 2: Foundational (タブ・ルーティング)

**Purpose**: 結びタブの追加とルーティング整備。全UIストーリーの前提。

**⚠️ CRITICAL**: ユーザーストーリーのUI作業はこのフェーズ完了後に開始

- [X] T008 Header.tsx に「結び」タブを追加する（歌合と歌位の間、パス `/groups`、ログイン必須） `apps/web/src/components/Header.tsx`
- [X] T009 App.tsx に `/musubi/join` ルートを追加し GroupJoinPage にマッピングする `apps/web/src/App.tsx`

**Checkpoint**: 5タブ表示（手習/稽古/歌合/結び/歌位）と QR ディープリンクルートが動作。

---

## Phase 3: User Story 1 - 結びを作成する (Priority: P1) 🎯 MVP

**Goal**: 認証済みユーザーが結びを作成し、主宰者になる。招待コードが自動発行される。

**Independent Test**: 結びタブから「結びを作る」→ 名前入力 → 作成 → 結びホーム表示＋招待コード確認

### Implementation for User Story 1

- [X] T010 [US1] GroupListPage の UI テキストを「結び」に統一する（「団体」「グループ」→「結び」） `apps/web/src/pages/GroupListPage.tsx`
- [X] T011 [US1] GroupCreatePage の UI テキストを「結び」に統一する `apps/web/src/pages/GroupCreatePage.tsx`

**Checkpoint**: 結びの作成フローが完成。バックエンドは既存の createGroup 関数がそのまま動作。

---

## Phase 4: User Story 2 - 招待コードで結びに参加する (Priority: P1)

**Goal**: 招待コード入力または QR ディープリンクで結びに参加し、一般メンバーになる。

**Independent Test**: (1) コード入力フォームから参加 → 結びホーム表示。(2) `/musubi/join?groupId=X&code=Y` から参加 → 同一結果。

### Implementation for User Story 2

- [X] T012 [US2] GroupJoinPage の UI テキストを「結び」に統一し、エラーメッセージが日本語で表示されることを確認する `apps/web/src/pages/GroupJoinPage.tsx`

**Checkpoint**: 招待コード参加と QR ディープリンク参加が動作。バックエンドは既存の joinGroup 関数がそのまま動作。

---

## Phase 5: User Story 3 - 結びホームを閲覧する（二分割表示） (Priority: P1)

**Goal**: 結びホームに「集い」セクションと「団体歌合（準備中）」セクションが表示される。

**Independent Test**: 結びホームを開き、2セクション（集い/団体歌合）が表示され、団体歌合は「準備中」でアクション不可。

### Implementation for User Story 3

- [X] T013 [US3] GroupHomePage を二分割レイアウトに改修する：「集い」セクション（集い一覧への導線）と「団体歌合」セクション（「準備中」表示、アクション不可）。UI テキストを「結び」「集い」に統一する `apps/web/src/pages/GroupHomePage.tsx`

**Checkpoint**: 結びホームが二分割構造で表示。メンバーでないユーザーには基本情報のみ表示。

---

## Phase 6: User Story 4 - 招待コードを管理する（主宰者のみ） (Priority: P2)

**Goal**: 主宰者が招待コードの再生成・無効化・QR 表示を行える。世話役/一般メンバーには操作ボタンが表示されない。

**Independent Test**: 主宰者として管理画面を開き、コード再生成・QR 表示・無効化を実行。世話役でログインし操作ボタンが非表示であることを確認。

### Implementation for User Story 4

- [X] T014 [US4] GroupHomePage の招待コード管理セクションで、権限に基づくボタン表示制御を確認し、UI テキストを「結び」に統一する（既存実装が仕様を満たしているか検証し、不足があれば修正） `apps/web/src/pages/GroupHomePage.tsx`

**Checkpoint**: 主宰者のみが招待コード管理操作を実行可能。監査ログが記録される。

---

## Phase 7: User Story 5 - 集い（イベント）を作成・閲覧する (Priority: P2)

**Goal**: 主宰者/世話役が集いを作成・公開・却下・終了できる。一般メンバーは published/closed のみ閲覧可能。

**Independent Test**: 主宰者として集い作成（draft）→ 公開（published）→ 一般メンバーで一覧表示確認。主宰者で却下（rejected）→ 一般メンバーから非表示確認。

### Implementation for User Story 5

- [X] T015 [US5] GroupEventPage の UI テキストを「集い」に統一し、以下の操作ボタンを追加する：公開（publishEvent）、下書きに戻す（unpublishEvent）、却下（rejectEvent、owner のみ）、終了（closeEvent）。ロールに基づく表示制御を実装する `apps/web/src/pages/GroupEventPage.tsx`
- [X] T016 [US5] GroupEventPage の一覧表示で可視性ルールを実装する：一般メンバーには published/closed のみ表示、owner/organizer には全状態を表示。rejected の集いには「却下」バッジを表示する `apps/web/src/pages/GroupEventPage.tsx`

**Checkpoint**: 集いの全ライフサイクル（draft→published→closed、draft→rejected）がUIから操作可能。可視性ルールが正しく適用される。

---

## Phase 8: User Story 6 - メンバーとロールを管理する（主宰者のみ） (Priority: P3)

**Goal**: 主宰者がメンバー一覧でロール変更・除外を行える。

**Independent Test**: 主宰者としてメンバー一覧を開き、ロール変更（世話役昇格）と除外を実行。世話役でログインし操作ボタンが非表示であることを確認。

### Implementation for User Story 6

- [X] T017 [US6] GroupMembersPage の UI テキストを「結び」に統一する（「団体」→「結び」、ロール名は主宰者/世話役/一般のまま） `apps/web/src/pages/GroupMembersPage.tsx`

**Checkpoint**: メンバー管理が仕様通りに動作。バックエンドは既存の changeRole/removeMember 関数がそのまま動作。

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 全ストーリー横断の最終確認

- [X] T018 全ページの UI テキストで「団体」「グループ」が残っていないことを最終確認する（grep で検索）
- [X] T019 functions をビルドし、エラーがないことを確認する `functions/` で `npm run build`
- [X] T020 frontend をビルドし、エラーがないことを確認する `apps/web/` で `npm run build`
- [ ] T021 quickstart.md のテストチェックリスト10項目を手動実行し、全項目パスすることを確認する
- [X] T022 sessions/events/rankings コレクションに対する変更が一切ないことを diff で確認する（FR-025 スコープ制限の検証）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on T001, T002 completion (型定義)
- **User Stories (Phase 3-8)**: All depend on Phase 2 completion (タブ・ルーティング)
  - US1 (Phase 3): Phase 2 完了後すぐ開始可能
  - US2 (Phase 4): Phase 2 完了後すぐ開始可能（US1 と並行可能）
  - US3 (Phase 5): Phase 2 完了後すぐ開始可能（US1/US2 と並行可能）
  - US4 (Phase 6): US3 に依存（GroupHomePage の二分割後に招待管理を検証）
  - US5 (Phase 7): Phase 1 完了後すぐ開始可能（rejectEvent 必要）
  - US6 (Phase 8): Phase 2 完了後すぐ開始可能（独立）
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (結び作成)**: Phase 2 のみに依存。独立テスト可能。
- **US2 (招待参加)**: Phase 2 のみに依存。US1 とは独立（既存結びがあればテスト可能）。
- **US3 (ホーム二分割)**: Phase 2 のみに依存。独立テスト可能。
- **US4 (招待管理)**: US3 に軽く依存（ホームの招待管理セクション）。
- **US5 (集い管理)**: Phase 1 に依存（rejectEvent）。独立テスト可能。
- **US6 (メンバー管理)**: Phase 2 のみに依存。完全に独立。

### Parallel Opportunities

- T001 と T002 は並行可能（異なるファイル）
- US1, US2, US3, US6 は Phase 2 完了後に並行作業可能
- US5 は Phase 1 完了後に開始可能（他ストーリーと並行可能）

---

## Parallel Example: Phase 1 Setup

```bash
# 型定義の更新（フロントエンドとバックエンドは並行可能）:
Task: "T001 [P] EventStatus に rejected を追加 apps/web/src/types/group.ts"
Task: "T002 [P] EventStatus に rejected を追加 functions/src/types/group.ts"
```

## Parallel Example: User Stories after Phase 2

```bash
# Phase 2 完了後、以下を並行作業可能:
Task: "T010 [US1] GroupListPage 用語統一"
Task: "T012 [US2] GroupJoinPage 用語統一"
Task: "T013 [US3] GroupHomePage 二分割レイアウト"
Task: "T017 [US6] GroupMembersPage 用語統一"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 + 3)

1. Complete Phase 1: Setup（型定義・rejectEvent API）
2. Complete Phase 2: Foundational（5タブ・ルーティング）
3. Complete Phase 3-5: US1 + US2 + US3（作成・参加・ホーム二分割）
4. **STOP and VALIDATE**: 結び作成→招待参加→ホーム表示の基本フローをE2Eテスト
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → 5タブ表示
2. US1 + US2 + US3 → 結びの基本フロー（MVP）
3. US4 + US5 → 招待管理 + 集い管理
4. US6 → メンバー管理
5. Polish → 用語統一確認 + ビルド検証 + スコープ制限検証

---

## Notes

- バックエンド（Cloud Functions）は 103-group-feature で 90% 以上完成済み。新規追加は rejectEvent 1本のみ。
- フロントエンドの主な作業は UI テキスト統一（「団体」→「結び」）と GroupHomePage の二分割レイアウト。
- GroupEventPage の操作ボタン追加（公開/却下/終了）が最も実装量の多いタスク。
- sessions/events/rankings への変更禁止を T022 で明示的に検証する。
