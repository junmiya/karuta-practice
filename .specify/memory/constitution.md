<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version change: 8.0.0 → 9.0.0 (MAJOR)

Modified sections:
  - 原則02: 段階0スコープ → 文言更新
  - 原則03: デバイス・UI方針 → グリッド方針を分離
  - 原則07: 公式性の定義 → サーバ権限を分離

Added sections:
  - 原則20: タブ構成（tabs_policy）
  - 原則21: アクセス方針（access_policy）
  - 原則22: グリッド方針（grid_policy）
  - 原則23: サーバ権限（server_authority）
  - 原則24: デザイン参照（design_reference）
  - 原則25: コンポーネント共通化（component_commonization）

Removed sections: なし

Templates requiring updates:
  - ✅ plan-template.md - Constitution Checkは汎用的で更新不要
  - ✅ spec-template.md - 汎用的で更新不要
  - ✅ tasks-template.md - 汎用的で更新不要

Follow-up TODOs: なし
================================================================================
-->

# 百人一首プロジェクト 憲法（Constitution）

あなたは「百人一首PJ（Web競技サービス）」の段階的開発を支援する実装仕様生成エージェントである。
段階0（MVP最小）は完了し、段階1では「運用の自動化」にフォーカスする。

---

## 原則01: 目的（purpose）

本プロジェクトは「百人一首・競技カルタの研鑽〜公式競技（番付）まで」をWebで提供する。

---

## 原則02: 段階0スコープ（scope_stage0）

段階0では以下を最小機能で成立させる：

- 公式競技（50問）
- 公式番付（公式扱い）
- 12枚固定UI

---

## 原則03: デバイス方針（device_policy）

- スマホ/タブレット/PCを問わず、札枚数は**全モード12枚固定**とする。

---

## 原則04: 札の縦横比（card_ratio）

- 札の縦横比は**縦:横 = 73:52**とし、UIはこの比率を崩さない。
- CSSでは `aspect-ratio: 52/73` または固定寸法 `width: 52mm; height: 73mm;` で表現する。

---

## 原則05: 用語統一（terminology）

- 読札（上の句）= **yomi**
- 取札（下の句）= **tori**
- 決まり字 = **kimariji**
- 決まり字数 = **kimarijiCount**

---

## 原則06: データソース（data_source）

- 歌データ（`poems.seed.json`）はクライアントに読み込み、UI表示に使う（段階0）。
- Firestoreへのseed投入は段階1以降で検討する。

---

## 原則07: 公式性の定義（official_policy）

- 「公式」扱いの記録は、クライアント計測値を**サーバ側で検証・確定**して初めて公式記録とする。
- クライアント側からの直接書き込みは禁止（Security Rulesでreject）。
- 番付に反映されるのは**confirmed**ステータスの記録のみ。

---

## 原則08: Cloud Functions方針（function_policy）

- 段階0は**Callable Function 1本のみ**許可する：`submitOfficialSession`
- この関数は公式競技の検証・確定処理に限定する。
- **Scheduled Functions**は段階0でも使用可：日次集計・番付更新に利用できる。

---

## 原則09: シーズン方針（season_policy）

- シーズンは**年4回**（spring / summer / autumn / winter）。
- 冬戦は年をまたぐが、**seasonIdは開始年で管理**する。
- seasonIdフォーマット：`YYYY_{spring|summer|autumn|winter}`（英語固定）

---

## 原則10: 部門・エントリー方針（division_policy）

- 競技エントリーは「**級位の部**」「**段位の部**」のどちらか1つのみ。
- 同一シーズン同時エントリーは不可。
- **段位の部**へのエントリーは「**六級保有**」が必要。
- シーズン開始時点の区分で固定。途中の段位取得でも当該シーズンは区分変更しない。

---

## 原則11: 番付・プライバシー方針（ranking_official / privacy）

- 番付/ランキングは「公式」として扱い、対象は**confirmed**の公式競技のみ。
- 番付に表示するのは**表示名（ニックネーム）のみ**。
- 掲載は**事前同意が必須**（同意しないとエントリー不可）。

---

## 原則12: 日付境界（daily_boundary）

- 日次集計は**JST 00:00〜23:59**とする。
- dayKeyJstはサーバで算出して保存する。
- クライアントのローカル時計は信用しない。

---

## 原則13: コスト方針（cost_guard）

- Blaze課金は無料枠内の運用を狙う。
- ただし、**月1万円までの出費は許容**する。
- 書き込み/読み取り回数を抑える設計を優先。

---

## 原則14: 段階1スコープ（scope_stage1）

段階1では「公式競技の運用を"自動で回る状態"にする」ことを最優先とし、以下を提供する：

1. **シーズン（年4回）の自動運用**
2. **番付の公式確定（凍結→確定→公開）**
3. **日別上位3セット反映**
4. **称号カウント**
5. **成績の可視化強化**

---

## 原則15: シーズン状態遷移（season_status）

シーズン状態は以下の順で遷移する：

```
open → frozen → finalized → archived
```

| 状態 | 説明 |
|------|------|
| open | 競技受付中 |
| frozen | 集計停止（確定準備） |
| finalized | 確定公開 |
| archived | 保管 |

- 凍結→確定の判定は「確定時点」で行う。
- 確定後は原則再計算しない（重大不正のみ再計算し告知）。

---

## 原則16: 集計ルール（aggregation_rules）

### 母集団
- 集計母集団は `confirmed` かつ `isRankEligible=true` の「反映セットのみ」とする。

### 日別反映
- 日別上位3セット反映は「日次トップ3（セッション単位）」を記録。
- 後続の番付スコアに反映できる構造とする。

### タイブレーク
- 同点時の比較は `lastReflectedSubmittedAt` を使用。
- これが小さい（早い）方を上位にする。

### 丸め・閾値
| ルール | 方式 |
|--------|------|
| 上位50%等の閾値判定 | ceil（切り上げ） |
| bonus等の丸め | 四捨五入（0.5以上切り上げ） |
| スコア負値 | `max(0, score)` を適用 |

---

## 原則17: 称号ルール（title_rules）

- 称号は**段位の部**の `finalized` 番付1位をカウント対象とする。
- 最低参加者**24名以上**が条件。

| 称号 | 条件 |
|------|------|
| 名人 | 4回 |
| 永世 | 8回（連続条件なし） |

---

## 原則18: 課金方針（billing_policy）

- 課金は**月額自動更新**。
- 解約後は次回更新日まで利用可能。
- **返金なし**。
- 利用停止中もデータは保持（成績は閲覧不可だが保持）。

---

## 原則19: 異常値判定拡張（anomaly_stage1）

段階0の5条件に加え、段階1で以下を拡張可能な設計とする：

6. **分布逸脱**: 極端短時間が多数など
7. ルールバージョン・閾値設定を運用で調整可能にする

---

## 原則20: タブ構成（tabs_policy）

Webページの主要タブは以下の4つとする：

| タブ | 機能 |
|------|------|
| **学習** | 札一覧・基本学習 |
| **研鑽** | 練習モード |
| **競技** | 公式競技 |
| **成績** | 成績閲覧 |

---

## 原則21: アクセス方針（access_policy）

| タブ | アクセス要件 |
|------|-------------|
| 学習 | **ログイン不要** |
| 研鑽 | **ログイン必須** |
| 競技 | **ログイン必須** |
| 成績 | **ログイン必須** |

---

## 原則22: グリッド方針（grid_policy）

- 札の配置は**4×3または3×4**とする。
- デバイスの向きで**自動切替**する：
  - 横向き = **4×3**
  - 縦向き = **3×4**

---

## 原則23: サーバ権限（server_authority）

以下の「公式領域」の更新は**サーバのみ**が実行できる（Security Rulesで強制）：

- 公式判定
- 番付更新
- 称号付与
- スコア確定

クライアントからの直接更新は一切許可しない。

---

## 原則24: デザイン参照（design_reference）

- 参照URL: https://www.u-tokyo.ac.jp/ja/index.html
- デザインは上記サイトの「**簡潔・余白・タイポ中心・節度あるアクセント**」の設計思想を参照する。
- ロゴ/画像/配色の**完全コピーはしない**。

---

## 原則25: コンポーネント共通化（component_commonization）

- Webコンポーネントは**共通化**する。
- 学習/研鑽/競技/成績で**同一部品を再利用**する。
- 重複実装を避け、保守性を確保する。

---

## 技術スタック（段階0）

- **Frontend**: Vite + React + TypeScript（SPA）
- **CSS**: Tailwind CSS（基本）
- **Backend**: Firebase（Auth / Firestore / Cloud Functions Callable / Scheduled Functions）
- **Hosting**: Firebase Hosting

---

## データモデル（段階0）

### poems（クライアント同梱 or Firestore）

必須フィールド：

- `poemId`: string（一意識別子）
- `order`: number（1-100）
- `yomi`, `yomiKana`: string
- `tori`, `toriKana`: string
- `yomiTokens`, `yomiKanaTokens`: string[]（改行レンダリング用）
- `toriTokens`, `toriKanaTokens`: string[]
- `yomiNoSpace`, `yomiKanaNoSpace`: string（スペースなし連結）
- `toriNoSpace`, `toriKanaNoSpace`: string
- `kimariji`: string
- `kimarijiCount`: number（1-6）
- `author`: string

### users/{uid}

- `nickname`: string（必須、番付表示用）
- `banzukeConsent`: boolean（必須、同意済み前提）
- `rank`: string（級位/段位、例："六級"）
- `createdAt`, `updatedAt`: timestamp

### seasons/{seasonId}

- `seasonId`: string（例："2026_spring"）
- `name`: string（表示名、例："2026年春場所"）
- `startDate`, `endDate`: timestamp
- `status`: "upcoming" | "active" | "ended"

### entries/{entryId}

- `uid`: string
- `seasonId`: string
- `division`: "kyu" | "dan"（級位の部/段位の部）
- `consentAt`: timestamp
- `createdAt`: timestamp

### sessions/{sessionId}

- `uid`: string
- `seasonId`: string
- `entryId`: string
- `roundCount`: number（50固定）
- `status`: "created" | "in_progress" | "submitted" | "confirmed" | "invalid" | "expired"
- `startedAt`: timestamp
- `submittedAt`: timestamp（クライアント）
- `confirmedAt`: timestamp（サーバ）
- `score`: number（サーバ算出、confirmed時のみ）
- `correctCount`: number
- `totalElapsedMs`: number
- `invalidReasons`: string[]（invalid時のみ）
- `dayKeyJst`: string（"YYYY-MM-DD"）

### sessions/{sessionId}/rounds/{roundIndex}

- `roundIndex`: number（0-49）
- `correctPoemId`: string
- `choices`: string[]（12個のpoemId）
- `selectedPoemId`: string
- `isCorrect`: boolean
- `clientElapsedMs`: number

### rankings/{seasonId}_{division}

- `seasonId`: string
- `division`: "kyu" | "dan"
- `entries`: [{ uid, nickname, score, rank, confirmedSessions }]
- `updatedAt`: timestamp

### userStats/{uid}

- `totalSessions`: number
- `confirmedSessions`: number
- `bestScore`: number
- `currentRank`: string

---

## セッション状態遷移

```
created → in_progress → submitted → confirmed
                                  → invalid
                                  → expired
```

- `expired`: 開始から60分経過でexpired扱い（段階0目安）

---

## スコア計算式（段階0）

```typescript
// クライアント計測値をサーバで検証後に算出
const tSec = totalElapsedMs / 1000;
const base = correctCount * 100;
const speedBonus = Math.round(Math.max(0, 300 - tSec));
const score = Math.max(0, base + speedBonus);
// 丸めは四捨五入（0.5以上切り上げ）で統一
```

---

## 異常値判定（段階0）

以下の条件に該当する場合は `invalid` とし、番付反映なし（参考記録）として扱う：

1. **round数不一致**: roundsが50未満、または重複がある
2. **選択肢整合性NG**: selectedPoemIdがchoices外
3. **極端な高速**: clientElapsedMs < 200ms が5回以上
4. **極端な低速**: clientElapsedMs > 60000ms が1回でも
5. **範囲外**: correctCountが0〜50の範囲外

invalid時の表示：`status: "invalid"` / 「番付反映なし（参考記録）」を明記

---

## セキュリティルール方針

- sessions/roundsは原則本人のみ書込可
- 確定領域（score, confirmedAt等）はサーバのみ更新
- publicRankingsはread-only

---

## 出力ルール

- 仕様（speckit.specify）→計画（speckit.plan）→タスク（speckit.tasks）→実装（speckit.implement）の整合性を最優先する。
- Next.jsを前提にしない（Vite + Reactを使用）。
- **Cloud Functions Callable**を使用する（公式提出・スコア確定用）。
- **Scheduled Functions**は段階0でも使用可（日次集計・番付更新用）。

---

## 段階1データモデル

### 新規コレクション

| コレクション | 用途 |
|--------------|------|
| `seasons/{seasonId}` | シーズン管理（状態遷移） |
| `rankings/{seasonId}_{division}` | 暫定ランキングキャッシュ |
| `banzukeSnapshots/{seasonId}_{division}` | 確定番付スナップショット |
| `dailyReflections/{seasonId}_{division}_{yyyymmdd}` | 日次反映記録 |
| `titles/{uid}` | 称号履歴 |
| `auditLogs/{eventId}` | 監査ログ |

### sessions拡張（段階1）

```typescript
interface Session {
  // ... 段階0のフィールド ...

  // 段階1追加
  isRankEligible: boolean;   // 番付反映対象
  reflectedAt?: Timestamp;   // 番付反映日時
  summary?: SessionSummary;  // 正規化サマリ
}
```

### users拡張（段階1）

```typescript
interface User {
  // ... 段階0のフィールド ...

  // 段階1追加
  subscription?: Subscription;
}

interface Subscription {
  status: "active" | "canceled" | "expired";
  plan: string;
  currentPeriodEnd: Timestamp;
  canceledAt?: Timestamp;
}
```

---

## 段階1 Scheduled Functions

| 関数 | スケジュール | 処理内容 |
|------|-------------|----------|
| `generateDailyReflections` | 毎日 00:05 JST | dailyReflections生成（上位3セッション） |
| `updateRankingsCache` | 5〜15分おき | 暫定ランキング更新 |
| `freezeSeason` | シーズン境界 | frozen状態に遷移 |
| `finalizeSeason` | frozen後24時間 | banzukeSnapshots作成、finalized |
| `updateTitles` | finalize後 | 称号カウント更新 |

---

## 段階1 セキュリティルール

| コレクション | read | write |
|--------------|------|-------|
| seasons | 全員 | サーバのみ |
| rankings | 全員 | サーバのみ |
| banzukeSnapshots | 全員 | サーバのみ |
| dailyReflections | 認証済 | サーバのみ |
| titles | 全員 | サーバのみ |
| auditLogs | 管理者のみ | サーバのみ |

---

**Version**: 9.0.0 | **Ratified**: 2026-01-17 | **Last Amended**: 2026-01-18
