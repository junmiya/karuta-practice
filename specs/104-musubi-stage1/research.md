# Research: 結び（段階1：結び＋集い）

**Branch**: `104-musubi-stage1` | **Date**: 2026-02-07

## R1: 既存実装の完成度

**Decision**: 103-group-featureのバックエンド実装をそのまま活用する（再実装しない）
**Rationale**: Cloud Functions 26本、Firestoreサービス4本、フロントエンドサービス/フック/ページ7本がすべて動作可能な状態。招待コードのハッシュ保存、ロールベース権限、監査ログもすべて実装済み。
**Alternatives considered**:
- 全面再実装 → 不要。既存コードは仕様と整合しており、変更コストが高い
- 部分的にリファクタリング → 段階1のスコープ外。動作するコードの改善は段階2以降

## R2: イベント（集い）のリジェクト状態追加

**Decision**: EventStatusに`rejected`を追加。バックエンドに`rejectEvent`関数を新設。
**Rationale**: 既存の状態遷移（draft→published→closed）にrejectedを加えることで、主宰者がdraft状態の集いを却下できる。rejectedはdraftからのみ遷移可能。
**Alternatives considered**:
- draftを削除する方式 → 監査ログで追跡不可になるため不適切
- closedと統合する → セマンティクスが異なる（closedは正常終了、rejectedは却下）

## R3: タブ追加の影響範囲

**Decision**: Header.tsxにTabButtonを1つ追加。App.tsxに`/musubi/join`ルートを追加。
**Rationale**: 既存の`/groups/*`ルートはそのまま使用可能。結びタブのアクティブ判定は`/groups`パスで行う。`/musubi/join`はQRディープリンク用の別名ルートとしてGroupJoinPageにマッピング。
**Alternatives considered**:
- 全ルートを`/musubi/*`にリネーム → 既存の103実装と互換性を壊す。段階2で検討

## R4: UI用語の統一方針

**Decision**: フロントエンドのUI表示テキストのみ「結び」「集い」に変更。コード内の変数名・コレクション名は変更しない。
**Rationale**: コード内の`group`/`event`はドメインモデルとして適切であり、UI表示用ラベルのみの変更で十分。コレクション名（groups, group_events等）の変更はマイグレーションが必要で段階1のスコープを超える。
**Alternatives considered**:
- コード内も全てmusubiに統一 → マイグレーションコスト大、既存データとの整合性問題

## R5: 招待コード長の確認

**Decision**: 既存のinviteService.tsで生成されるコード長が16文字以上であることを確認し、不足なら修正。
**Rationale**: clarifyで合意した通り、段階1ではレート制限の代わりにコード長で安全性を担保する。
**Alternatives considered**:
- レート制限を実装 → 段階1のスコープ外と合意済み

## R6: 集いの可視性ルール

**Decision**: draft状態の集いは主宰者（owner）と世話役（organizer）のみに表示。published以降は全メンバーに表示。rejected状態の集いは主宰者/世話役にのみ表示（却下理由の確認用）。
**Rationale**: clarifyで合意。未完成のイベントがメンバーに見えると混乱を招く。
**Alternatives considered**:
- draftも全員に表示（「下書き」ラベル付き） → 却下（混乱防止のため）
- 状態遷移なしで作成即公開 → 却下（主宰者の承認フローが必要）
