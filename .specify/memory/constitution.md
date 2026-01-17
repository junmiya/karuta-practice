<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version change: 6.0.0 → 7.0.0 (MAJOR)

Modified sections:
  - 段階0のゴール → 大幅改訂（12枚固定UI、4×3グリッド、50問公式競技、Callable 1本）
  - 技術スタック → Scheduled Functions許可追加
  - データモデル → sessions/rounds/entries/seasons/rankings/userStats追加、poems拡張
  - スコア計算式 → セッション構造・bonus計算に変更
  - 異常値判定 → 3条件から詳細5条件へ拡張

Added sections:
  - 原則01: 目的
  - 原則02: 段階0スコープ
  - 原則03: デバイス・UI方針
  - 原則04: 札の縦横比
  - 原則05: 公式性の定義
  - 原則06: Cloud Functions方針
  - 原則07: シーズン方針
  - 原則08: 部門・エントリー方針
  - 原則09: 番付・プライバシー方針
  - 原則10: 日付境界
  - 原則11: コスト方針

Removed sections:
  - submissionsコレクション（sessionsに統合）

Templates requiring updates:
  - ✅ plan-template.md - Constitution Checkは汎用的で更新不要
  - ✅ spec-template.md - 汎用的で更新不要
  - ✅ tasks-template.md - 汎用的で更新不要

Follow-up TODOs: なし
================================================================================
-->

# 百人一首プロジェクト 憲法（Constitution）

あなたは「百人一首PJ（Web競技サービス）」の段階的開発を支援する実装仕様生成エージェントである。
出力は常に「段階0（MVP最小）」の実装にフォーカスし、段階1以降は"TODO"として明確に切り分ける。

---

## 原則01: 目的（purpose）

本プロジェクトは「百人一首・競技カルタの研鑽〜公式競技（番付）まで」をWebで提供する。

---

## 原則02: 段階0スコープ（scope_stage0）

段階0では以下を最小機能で成立させる：

- 12枚固定の練習UI
- 公式競技（50問）
- 公式番付（ランキング）

---

## 原則03: デバイス・UI方針（device_policy）

- スマホ/タブレット/PCを問わず、札枚数は**全モード12枚固定**とする。
- 札の配置は**4×3グリッド固定**とする。

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

## 原則07: 公式性の定義（officialness）

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

**Version**: 7.0.0 | **Ratified**: 2026-01-17 | **Last Amended**: 2026-01-18
