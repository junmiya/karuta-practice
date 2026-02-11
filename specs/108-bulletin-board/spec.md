# Feature Specification: 掲示板（瓦版・不具合の部屋）

**Feature Branch**: `108-bulletin-board`
**Created**: 2026-02-11
**Status**: Draft
**Input**: [User Request: 掲示板機能](speckit.specify) + [User Feedback: メンバーによる募集許可とプライバシー配慮]

## Goal

- **瓦版**: 公式/準公式の告知を集約し、周知漏れを防ぐ
- **不具合の部屋**: 報告→質問→確認→修正→クローズのサイクルをチケット管理で効率化
- **報告品質向上**: バグ報告時に「対象機能（タブ）」選択を必須化し、切り分けを高速化

## User Scenarios

### User Story 1 - 開発者が瓦版で告知を行う

**Given** developer ロールのユーザー
**When** 瓦版タブで「新規投稿」を選択し、種別（機能追加、障害報告、団体募集）を選んで投稿
**Then** 全ユーザーの瓦版タイムラインに表示される（ピン留め投稿は最上部）

### User Story 2 - 内弟子が不具合を報告する

**Given** uchideshi ロールのユーザー
**When** グローバルCTA「不具合を報告」または不具合の部屋から「新規チケット」を作成
**And** 対象機能（例: 稽古）、再現手順、期待値、実績値を入力して送信
**Then** ステータス `new` のチケットが作成され、一覧に表示される

### User Story 3 - 開発者が不具合を確認・修正する

**Given** developer ロールのユーザー
**When** `new` のチケットを開き、内容を確認して `confirmed` に変更（UIショートカット利用可）
**And** 修正完了後、`fixed` に変更（UIショートカット利用可）
**Then** 報告者にステータス変更が伝わり、解決済みとなる

### User Story 4 - 団体メンバーがメンバー募集を行う

**Given** `member` 以上のユーザー（所属団体の承認済みメンバー）
**When** 瓦版で `group_recruit` タイプを選択し、所属団体IDと有効期限（最大14日）を設定して投稿
**And** 対象団体が「募集中」設定（`isRecruitmentEnabled: true`）になっている
**Then** 投稿が受理され、タイムラインに表示される
**But** 対象団体が募集停止中であれば、投稿は拒否される

## Functional Requirements

### 掲示板共通

- **FR-001**: 掲示板画面に「瓦版」「不具合の部屋」タブを表示
- **FR-002**: 投稿・コメントの作成者、作成日時、更新日時を表示

### 瓦版（Kawaraban）

- **FR-003**: 閲覧は全ログインユーザー（`member` 以上）可能
- **FR-004**: システム告知・外部リンク投稿は `developer` のみ。`group_recruit` は団体の `member` 以上が投稿可能
- **FR-005**: 投稿タイプ `external_news`、`system_news`、`group_recruit`
- **FR-006**: `group_recruit` は1団体につき有効な募集は1件のみ。投稿者はその団体のメンバーであること
- **FR-007**: `group_recruit` は有効期限（最大14日）が必須
- **FR-008**: `group_recruit` 投稿時、対象団体の `isRecruitmentEnabled` が `true` であることを検証
- **FR-009**: 団体設定に「瓦版での募集を許可（`isRecruitmentEnabled`）」フラグを追加（デフォルト `false`）

### 不具合の部屋（Bug Room）

- **FR-011**: 閲覧・投稿・コメントは `inner`（uchideshi）および `developer` のみ（クローズド）
- **FR-012**: チケット作成時、`targetArea`（対象機能）の選択が必須
- **FR-013**: ステータス変更・クローズは `developer` のみ
- **FR-014**: UIショートカット: `confirmed` チェックで status -> `confirmed`
- **FR-015**: UIショートカット: `developed` チェックで status -> `fixed`
- **FR-016**: グローバルCTA「不具合を報告」を常設

## Roles & Permissions

| Feature | Role | Read | Create | Update | Delete | Status Change |
| ------- | ---- | :--: | :----: | :----: | :----: | :-----------: |
| **Kawaraban** | `member` | ✅ | ✅(Recruit) | ✅(Own) | ✅(Own) | |
| | `inner` | ✅ | ✅(Recruit) | ✅(Own) | ✅(Own) | |
| | `developer` | ✅ | ✅ | ✅ | ✅ | |
| **Bug Room** | `member` | | | | | |
| | `inner` | ✅ | ✅ | | | |
| | `developer` | ✅ | ✅ | ✅ | ✅ | ✅ |

*Note: `inner` = `siteRole: 'uchideshi'`, `developer` = `siteRole: 'admin'`*

## Scope

### In Scope

- 掲示板タブ UI（瓦版/不具合）
- 投稿/チケットの CRUD（権限ありのみ）
- コメント機能（不具合のみ）
- フィルタ機能（ステータス、対象機能、投稿タイプ）
- 団体募集の制約ロジック（14日期限、1団体1件）
- グローバル CTA

### Out of Scope

- 画像アップロード（MVPはテキストのみ、画像はGyazo等のURL貼り付け）
- リアクション（いいね機能）
- メンション通知
- 未読バッジ
- 外部リンクの自動OGP展開

## Success Criteria

- **SC-001**: 内弟子が迷わず不具合報告を行える（対象機能選択の必須化）
- **SC-002**: 開発者が「あのバグどうなった？」と聞かれる回数が減る（ステータスの可視化）
- **SC-003**: 団体募集が乱立せず、期限切れの古い募集が自動的に整理される
