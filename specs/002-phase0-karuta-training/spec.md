# Feature Specification: Phase 0 - 競技かるた訓練プラットフォーム（MVP最小）

**Feature Branch**: `002-phase0-karuta-training`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "段階0: 実装仕様（MVP最小） - 札閲覧めくり、認証、訓練（決まり字別・多択）、記録保存、成績閲覧"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 札一覧閲覧とめくり機能（ログイン不要） (Priority: P1) 🎯 MVP

ユーザーはログインせずに百人一首の札を閲覧し、yomi（読札）をクリックしてtori（取札）にめくり、ひらがな表示に切り替えられる。

**Why this priority**: ログイン不要で使える基本学習機能であり、新規ユーザーの障壁が低い。段階0の最小MVPとして最優先。

**Independent Test**: ブラウザでHomeにアクセス → 「札を見る」クリック → 札一覧表示 → 札をクリックしてyomi⇔tori切り替え → ひらがな表示切替が動作 → 8枚/16枚表示切替が動作

**Acceptance Scenarios**:

1. **Given** ユーザーがHomeページにアクセスする、**When** 「札を見る」をクリック、**Then** 札一覧ページ（/cards）に遷移し、デフォルト8枚の札が表示される
2. **Given** 札一覧が表示されている、**When** 札カードをクリック、**Then** yomi（読札）からtori（取札）に切り替わる（または逆）
3. **Given** 札一覧が表示されている、**When** 「ひらがな表示」トグルをクリック、**Then** yomi/toriがyomiKana/toriKanaに切り替わる
4. **Given** 札一覧が表示されている、**When** 各札カードを確認、**Then** 決まり字（kimariji）と決まり字数（kimarijiCount）が表示される
5. **Given** 札一覧が8枚表示モード、**When** 「16枚表示」に切り替え、**Then** 16枚の札が表示される
6. **Given** 札一覧が表示されている、**When** 決まり字フィルタ（kimarijiCountまたはkimariji）を選択、**Then** 該当する札のみが表示される

---

### User Story 2 - ログイン・認証機能 (Priority: P2)

ユーザーはGoogleまたは匿名ログインで認証でき、訓練モードと成績閲覧にアクセスできる。

**Why this priority**: 訓練モードと成績閲覧の前提機能。基本モード実装後に追加。

**Independent Test**: Homeページ → 「ログイン」クリック → Googleログイン → 認証成功 → Homeに戻る → ログアウト確認

**Acceptance Scenarios**:

1. **Given** 未ログインユーザーがHomeにアクセス、**When** 「ログイン」をクリック、**Then** ログインページ（/login）に遷移し、GoogleログインボタンとSignInAnonymouslyボタンが表示される
2. **Given** ログインページが表示されている、**When** Googleログインボタンをクリック、**Then** Google認証フローが開始され、認証成功後Homeにリダイレクトされる
3. **Given** ログインページが表示されている、**When** 匿名ログインボタンをクリック、**Then** 匿名認証が完了し、Homeにリダイレクトされる
4. **Given** ログイン済みユーザー、**When** Homeページにアクセス、**Then** ヘッダーにユーザー名（またはUID）とログアウトボタンが表示される
5. **Given** ログイン済みユーザー、**When** ログアウトボタンをクリック、**Then** ログアウトが完了し、未ログイン状態のHomeにリダイレクトされる
6. **Given** 未ログインユーザー、**When** 訓練ページ（/training）または成績ページ（/results）に直接アクセス、**Then** ログインページにリダイレクトされる

---

### User Story 3 - 訓練モード（決まり字別・多択）とclientElapsedMs計測 (Priority: P1) 🎯 MVP核心

ログインユーザーは決まり字数または決まり字でフィルタリングし、yomi提示→tori選択（8択/16択）の訓練を行い、計測時間（clientElapsedMs）を記録できる。

**Why this priority**: 段階0の核心機能であり、「訓練・計測」を実現する。

**Independent Test**: ログイン → 「訓練する」クリック → 決まり字数フィルタ選択（例:3字決まり） → 8択選択 → 訓練開始 → yomi表示 → tori選択肢から選択 → 正誤判定と経過時間表示 → 次へ進む → 10問完了

**Acceptance Scenarios**:

1. **Given** ログイン済みユーザーがHomeにアクセス、**When** 「訓練する」をクリック、**Then** 訓練ページ（/training）に遷移し、セットアップ画面が表示される
2. **Given** セットアップ画面が表示されている、**When** 決まり字数フィルタ（例:3字決まり）を選択、**Then** 該当する札が候補にフィルタリングされる
3. **Given** セットアップ画面でフィルタ済み、**When** 8択または16択を選択、**Then** 選択肢数が設定される
4. **Given** セットアップ完了、**When** 「訓練開始」をクリック、**Then** 1問目のyomi（読札）が表示され、tori（取札）の選択肢が8択（または16択）で表示される
5. **Given** 問題が表示されている、**When** 選択肢をクリック、**Then** clientElapsedMs（表示開始～クリックまでのms）が計測され、正誤判定が表示される
6. **Given** 正誤判定が表示されている、**When** 「次へ」をクリック、**Then** 次の問題が表示される
7. **Given** 10問完了、**When** 最後の問題で「次へ」をクリック、**Then** セット完了画面が表示され、平均時間と正答率が表示される

---

### User Story 4 - 訓練結果の保存（Firestore） (Priority: P1) 🎯 MVP核心

訓練完了後、結果をFirestoreの`/users/{uid}/trainingSets/{setId}`に保存し、異常値判定（isSuspicious）を行う。

**Why this priority**: 訓練結果を永続化し、成績閲覧の前提となる。

**Independent Test**: 訓練完了 → 結果保存 → Firestore Consoleで`/users/{uid}/trainingSets/{setId}`にドキュメント作成確認 → flags.isReferenceとflags.invalidReasonフィールド確認

**Acceptance Scenarios**:

1. **Given** 訓練セット完了、**When** 結果保存処理が実行される、**Then** Firestoreの`/users/{uid}/trainingSets/{setId}`にドキュメントが作成される
2. **Given** 結果保存時、**When** データ構造を確認、**Then** mode, choiceCount, filter, startedAtClientMs, submittedAtClientMs, submittedAt, items[], summary, flagsフィールドが含まれる
3. **Given** 結果保存時、**When** 異常値判定を実行、**Then** clientElapsedMs < 150msまたは> 120000msの場合、flags.isReference=trueおよびflags.invalidReasonが設定される
4. **Given** 結果保存時、**When** 1セット内で同一ms値が極端に連続（例:10問中8問が同一値）、**Then** flags.isReference=trueおよびflags.invalidReason="連続同一ms値"が設定される
5. **Given** 結果保存失敗、**When** Firestore接続エラーが発生、**Then** エラーメッセージが表示され、リトライオプションが提示される

---

### User Story 5 - 成績閲覧（セット履歴・苦手抽出） (Priority: P2)

ログインユーザーは自分の訓練履歴（最新20件）を閲覧し、苦手な札（平均時間が遅い/誤答が多い）を可視化できる。

**Why this priority**: 訓練結果を活用して学習改善に役立てる。訓練と記録保存の後に実装。

**Independent Test**: ログイン → 「成績を見る」クリック → セット一覧表示（最新20件） → セット詳細クリック → 各問の結果表示 → 苦手抽出グラフ表示

**Acceptance Scenarios**:

1. **Given** ログイン済みユーザーがHomeにアクセス、**When** 「成績を見る」をクリック、**Then** 成績ページ（/results）に遷移し、セット一覧（最新20件）が表示される
2. **Given** セット一覧が表示されている、**When** 各セット項目を確認、**Then** 日時、モード、選択肢数（8or16）、正答率、平均時間が表示される
3. **Given** セット一覧が表示されている、**When** セット項目をクリック、**Then** セット詳細ページに遷移し、各問のms、正誤、poemIdが表示される
4. **Given** セット詳細が表示されている、**When** グラフを確認、**Then** 各問の時間がグラフで可視化される
5. **Given** 成績ページが表示されている、**When** 苦手抽出セクションを確認、**Then** 平均時間が遅い上位10首と誤答が多い上位10首が表示される
6. **Given** 成績データに参考記録（flags.isReference=true）が含まれる、**When** セット一覧を表示、**Then** 参考記録には「参考記録（番付反映なし）」のラベルが表示される

---

### User Story 6 - Seedデータ投入（開発者向け） (Priority: P3)

開発者またはシステム管理者は、`npm run seed:poems`コマンドでFirestoreに100件のpoemsをupsertできる。

**Why this priority**: データ投入は開発の前提条件だが、エンドユーザー向け機能ではないため優先度はP3。

**Independent Test**: `npm run seed:poems`を実行 → コンソールに「✅ Seeded 100 poems successfully.」表示 → Firestore Consoleで100件のドキュメント確認

**Acceptance Scenarios**:

1. **Given** Firestoreが空の状態、**When** `npm run seed:poems`を実行、**Then** 100件のpoemsがFirestoreに投入される
2. **Given** Firestoreに既存のpoemsがある、**When** `npm run seed:poems`を再実行、**Then** 同じpoemIdのデータは上書き（upsert）され、重複しない
3. **Given** seedスクリプトが完了、**When** 処理が終了、**Then** コンソールに投入された件数（100件）がログ表示される

---

### Edge Cases

- **異常値判定（極端に短い）**: clientElapsedMs < 150msの場合、flags.isReference=trueおよびflags.invalidReason="反応時間が不自然に短い"を設定
- **異常値判定（極端に長い）**: clientElapsedMs > 120000ms（120秒超）の場合、flags.isReference=trueおよびflags.invalidReason="放置と判定"を設定
- **異常値判定（連続同一値）**: 1セット内で同一ms値が極端に連続（例:10問中8問が同一値）の場合、flags.isReference=trueおよびflags.invalidReason="計測停止の疑い"を設定
- **Firestore接続失敗**: 計測結果保存失敗時、エラーメッセージを表示し、リトライオプションを提示
- **ログイン失敗**: Firebase Auth接続失敗時、エラーメッセージを表示し、基本モードのみ利用可能にする
- **環境変数未設定**: Firebase設定用の環境変数（`.env`）が設定されていない場合、アプリケーション起動時にエラーを表示する

## Requirements *(mandatory)*

### Functional Requirements

#### Pages & Navigation
- **FR-001**: システムはHomeページ（/）を提供し、「札を見る」「訓練する」「成績を見る」「ログイン」の導線を表示しなければならない（節気表示は段階0では実装しない）
- **FR-002**: システムは札一覧ページ（/cards）へのアクセスをログインなしで許可しなければならない
- **FR-003**: システムは訓練ページ（/training）と成績ページ（/results）へのアクセスをログイン必須とし、未ログイン時はログインページ（/login）へリダイレクトしなければならない

#### 用語・データモデル
- **FR-004**: システムは以下の用語を統一して使用しなければならない：
  - 読札（上の句）= yomi（表記）/ yomiKana（ひらがな）
  - 取札（下の句）= tori（表記）/ toriKana（ひらがな）
  - 決まり字 = kimariji（文字列）
  - 決まり字数 = kimarijiCount（数値）
  - セット = 一連の出題（8択/16択）をまとめたプレイ単位
- **FR-005**: poemsデータは以下のフィールドを持たなければならない：
  - poemId: "p001"〜"p100"（固定）
  - order: 1〜100（番号順）
  - yomi, yomiKana, tori, toriKana（文字列）
  - kimarijiCount（1〜6）, kimariji（文字列）, author（作者名）

#### 札一覧（めくり）
- **FR-006**: 札一覧ページは100首の札を一覧表示しなければならない（デフォルト8枚、16枚表示に切替可能）
- **FR-007**: 各札カードはクリックでyomi⇔toriを切り替えられなければならない
- **FR-008**: 札一覧ページは「ひらがな表示」トグル機能を提供し、yomi/toriとyomiKana/toriKanaを切り替えられなければならない
- **FR-009**: 各札カードは決まり字（kimariji）と決まり字数（kimarijiCount）を表示しなければならない
- **FR-010**: 札一覧ページは決まり字フィルタ機能を提供し、kimarijiCountまたはkimarijiで絞り込み表示できなければならない

#### 認証
- **FR-011**: システムはFirebase AuthによるGoogleログイン機能を提供しなければならない
- **FR-012**: システムはFirebase Authによる匿名ログイン機能を提供しなければならない
- **FR-013**: システムはログイン状態を管理し、ヘッダーにユーザー名（またはUID）とログアウトボタンを表示しなければならない
- **FR-014**: システムはログアウト機能を提供し、ログアウト後は未ログイン状態のHomeにリダイレクトしなければならない

#### 訓練モード
- **FR-015**: 訓練モードはセットアップ画面を提供し、決まり字数または決まり字でフィルタリング機能を提供しなければならない（段階0は1条件選択のみでも可）
- **FR-016**: 訓練モードは8択または16択の選択肢数設定を提供しなければならない
- **FR-017**: 訓練モードは問題数設定を提供しなければならない（最大10〜30問程度、段階0は固定10問でも可）
- **FR-018**: 訓練モードはyomi提示→tori選択（8択/16択）の問題形式を提供しなければならない
- **FR-019**: 訓練モードは選択肢クリック時に計測時間（clientElapsedMs）をミリ秒単位で記録しなければならない（表示開始～クリックまで）
- **FR-020**: 訓練モードは正解/不正解を判定し、結果画面で正誤と経過時間を表示しなければならない
- **FR-021**: 訓練モードはセット完了時に平均時間と正答率を表示しなければならない

#### 記録保存（Firestore）
- **FR-022**: 訓練完了時、結果をFirestoreの`/users/{uid}/trainingSets/{setId}`に保存しなければならない
- **FR-023**: 保存データは以下のフィールドを含まなければならない：
  - mode: "training"（固定）
  - choiceCount: 8 | 16
  - filter: { kimariji?: string, kimarijiCount?: number }
  - startedAtClientMs: number（Date.now()）
  - submittedAtClientMs: number（Date.now()）
  - submittedAt: serverTimestamp（保存時）
  - items: array（{ poemId, isCorrect, clientElapsedMs, chosenPoemId, presentedAtClientMs }）
  - summary: { total, correct, avgElapsedMs }
  - flags: { isReference: boolean, invalidReason?: string }
- **FR-024**: 保存時、itemsサイズが大きくなる場合は最大30問程度に制限しなければならない（段階1でsubcollection化を検討）

#### 異常値判定
- **FR-025**: システムは以下の条件でflags.isReference=trueおよびflags.invalidReasonを設定しなければならない：
  - (A) clientElapsedMs < 150ms → invalidReason="反応時間が不自然に短い"
  - (B) clientElapsedMs > 120000ms（120秒超） → invalidReason="放置と判定"
  - (C) 1セット内で同一ms値が極端に連続（例:10問中8問が同一値） → invalidReason="計測停止の疑い"
- **FR-026**: flags.isReference=trueの記録は、UI上で「参考記録（番付反映なし）」と明記しなければならない
- **FR-027**: 成績集計では、flags.isReference=trueの記録を除外しなければならない

#### 成績閲覧
- **FR-028**: 成績ページはセット一覧（最新20件）を表示しなければならない
- **FR-029**: セット一覧は各セットの日時、モード、選択肢数（8or16）、正答率、平均時間を表示しなければならない
- **FR-030**: セット詳細ページは各問のms、正誤、poemIdを表示しなければならない
- **FR-031**: セット詳細ページは各問の時間をグラフで可視化しなければならない
- **FR-032**: 成績ページは苦手抽出セクションを提供し、平均時間が遅い上位10首と誤答が多い上位10首を表示しなければならない

#### Seedデータ投入
- **FR-033**: システムは`npm run seed:poems`コマンドを提供し、100件のpoemsをFirestoreにupsertしなければならない
- **FR-034**: Seedスクリプトは同じpoemIdのデータを上書き（upsert）し、重複を防がなければならない
- **FR-035**: Seedスクリプトは投入完了後にコンソールへ投入件数をログ表示しなければならない
- **FR-036**: Seedデータは`data/poems.seed.json`ファイルに100件の百人一首データを含まなければならない

#### Cloud Functions方針
- **FR-037**: 段階0ではCloud Functions（Callable/Scheduled）を使用しない設計で完結させなければならない
- **FR-038**: 将来の拡張指針として、以下を明記すること：
  - Callable: 使用しない（段階1以降で検討）
  - Scheduled: 使用しない（段階1以降でランキング/番付集計に検討）

#### CSS方針
- **FR-039**: UIはTailwind CSSを基本として実装しなければならない
- **FR-040**: コンポーネント単位でclassを集約し、複雑化したらCSS Modulesを併用可能としなければならない

#### デプロイ
- **FR-041**: システムはFirebase Hosting（SPA）にデプロイされなければならない
- **FR-042**: ルーティングはクライアント側（React Router等）で実装しなければならない

### Key Entities

- **Poem**: 百人一首の1首を表すデータ。以下の属性を持つ：
  - poemId: 各poemを一意に識別するID（p001〜p100）
  - order: 百人一首における番号（1から100）
  - yomi: 読札（上の句）のテキスト
  - yomiKana: 読札のひらがな表記
  - tori: 取札（下の句）のテキスト
  - toriKana: 取札のひらがな表記
  - kimarijiCount: 決まり字の数（1から6）
  - kimariji: 決まり字（文字列）
  - author: 作者名

- **TrainingSet**: 訓練セットの結果を表すデータ。以下の属性を持つ：
  - setId: セットを一意に識別するID（自動生成）
  - uid: ユーザーID
  - mode: "training"（固定）
  - choiceCount: 選択肢数（8または16）
  - filter: フィルタ条件（kimariji?: string, kimarijiCount?: number）
  - startedAtClientMs: 開始時刻（クライアント側のDate.now()）
  - submittedAtClientMs: 提出時刻（クライアント側のDate.now()）
  - submittedAt: 提出時刻（サーバータイムスタンプ）
  - items: 各問の結果配列（poemId, isCorrect, clientElapsedMs, chosenPoemId, presentedAtClientMs）
  - summary: 集計結果（total: 総問題数, correct: 正答数, avgElapsedMs: 平均時間）
  - flags: フラグ（isReference: 参考記録フラグ, invalidReason?: 無効理由）

- **User**: ユーザー情報を表すデータ。以下の属性を持つ：
  - uid: ユーザーを一意に識別するID（Firebase Auth UID）
  - displayName: 表示名（任意、段階0では最小）
  - createdAt: 作成日時（サーバータイムスタンプ）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ユーザーはログインなしで札一覧ページにアクセスし、100首の札を5秒以内に表示できる
- **SC-002**: ユーザーは札カードをクリックしてyomi⇔tori切り替えが1秒以内に反応する
- **SC-003**: ユーザーはひらがな表示トグルをクリックし、1秒以内に表示が切り替わる
- **SC-004**: ユーザーは決まり字フィルタを選択し、2秒以内に絞り込み結果が表示される
- **SC-005**: ユーザーはGoogleまたは匿名ログインを完了し、5秒以内にHomeにリダイレクトされる
- **SC-006**: ログインユーザーは訓練モードにアクセスし、2秒以内にセットアップ画面が表示される
- **SC-007**: ユーザーは訓練開始後、yomi提示からtori選択までの時間（clientElapsedMs）が正確にミリ秒単位で計測される
- **SC-008**: ユーザーは訓練完了後、結果がFirestoreに3秒以内に保存される
- **SC-009**: 異常値（clientElapsedMs < 150msまたは> 120000ms）が検出された場合、flags.isReference=trueおよびflags.invalidReasonが設定される
- **SC-010**: ユーザーは成績ページにアクセスし、セット一覧（最新20件）が5秒以内に表示される
- **SC-011**: ユーザーはセット詳細を確認し、各問の結果とグラフが3秒以内に表示される
- **SC-012**: ユーザーは苦手抽出を確認し、平均時間が遅い上位10首と誤答が多い上位10首が5秒以内に表示される
- **SC-013**: 開発者は`npm run seed:poems`を実行し、100件のpoemsが30秒以内にFirestoreに投入される
- **SC-014**: Seedスクリプトは投入完了後、コンソールに「✅ Seeded 100 poems successfully.」が表示される

## Assumptions

- Firebaseプロジェクトは既に作成されており、Blazeプランに登録済み（月1万円まで許容）
- 開発環境にはNode.js（v18以上推奨）とnpmがインストールされている
- 百人一首データ（100首）の正確なテキストは`data/poems.seed.json`に事前に準備されている（yomi/tori形式）
- デプロイ先はFirebase Hostingを使用する
- UIはVite + React + TypeScript + Tailwind CSSで構築する（Next.jsは使用しない）
- 段階0ではCloud Functionsを使用せず、クライアントサイド計測のみで完結する
- 節気表示は段階0では実装しない
- 参考番付は段階0では実装しない（成績閲覧のみ実装）
- シーズン管理は段階1以降で実装する
- itemsサイズは最大30問程度に制限し、段階1でsubcollection化を検討する
