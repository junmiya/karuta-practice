# Data Model: 歌合・節気別歌位確定システム

**Feature**: 102-utaawase-sekki-ranking
**Date**: 2026-01-27

## New Collections

### `rulesets/current`

| Field | Type | Description |
|-------|------|-------------|
| version | string | セマンティックバージョン (e.g. "1.0.0") |
| yamlContent | string | YAML原文 |
| rules | map | パース済みルール |
| rules.kyui | map[] | 級位条件 (初級→六級: kimarijiMax, isAllCards, accuracyMin) |
| rules.dan | map[] | 段位条件 (初段→六段: placementRule, requiresOfficial, requiresAllCards) |
| rules.den | map[] | 伝位条件 (初伝→永世名歌位: placementMax, times, requiresOfficial) |
| rules.promotion | map | 昇格制御 (noSkip, oneStepPerEvaluation) |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| updatedBy | string | admin uid |

### `season_calendars/{year}`

| Field | Type | Description |
|-------|------|-------------|
| year | number | 対象年 (e.g. 2026) |
| markers.risshun | timestamp | 立春 |
| markers.rikka | timestamp | 立夏 |
| markers.risshuu | timestamp | 立秋 |
| markers.rittou | timestamp | 立冬 |
| markers.risshun_next | timestamp | 翌年立春 |
| periods.spring | map | { startAt, endAt } = [risshun, rikka) |
| periods.summer | map | { startAt, endAt } = [rikka, risshuu) |
| periods.autumn | map | { startAt, endAt } = [risshuu, rittou) |
| periods.winter | map | { startAt, endAt } = [rittou, risshun_next) |
| publishedAt | timestamp | 公開日時 |
| publishedBy | string | admin uid |

### `events/{eventId}`

| Field | Type | Description |
|-------|------|-------------|
| eventId | string | UUID |
| uid | string | 実行者 |
| eventType | string | 'kyui_exam' \| 'match' |
| startAt | timestamp | イベント開始日時 |
| seasonId | string | 'spring' \| 'summer' \| 'autumn' \| 'winter' |
| seasonYear | number | 開始年 |
| tier | string \| null | 'official' \| 'provisional' \| null(検定) |
| status | string | 'draft' \| 'final' |
| sessionId | string? | 元セッションID (match時) |
| kyuiExam | map? | { kimarijiMax, isAllCards, total, correct, durationSeconds } |
| match | map? | { participantCount, placement, allCards, score, correctCount, totalElapsedMs } |
| createdAt | timestamp | |

**Indexes**: `(uid, seasonYear, seasonId)`, `(seasonYear, seasonId, tier)`

### `user_progress/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| uid | string | |
| kyuiRankId | string | 現在の級位 ('none' \| 'kyui_10' ... 'kyui_6') |
| danRankId | string | 現在の段位 ('none' \| 'dan_1' ... 'dan_6') |
| denUtaRankId | string | 現在の伝位/歌位 ('none' \| 'den_1' ... 'eisei_meikagai') |
| flags.danEligible | boolean | 六級到達で true |
| flags.denEligible | boolean | 六段到達で true |
| counters.winsOfficial | number | 公式優勝回数 |
| counters.top2Official | number | 公式2位以内回数 |
| counters.top3Official | number | 公式3位以内回数 |
| seasons | map | { [seasonKey]: { scores: number[], bestThreeTotal: number, matchCount: number } } |
| promotionHistory | array | [{ from, to, at, reason, seasonId }] |
| updatedAt | timestamp | |

### `season_snapshots/{year}_{seasonId}`

| Field | Type | Description |
|-------|------|-------------|
| seasonYear | number | |
| seasonId | string | |
| interval.startAt | timestamp | 戦の開始 |
| interval.endAt | timestamp | 戦の終了 |
| pipeline.status | string | 'draft' \| 'frozen' \| 'finalized' \| 'published' |
| pipeline.frozenAt | timestamp? | |
| pipeline.finalizedAt | timestamp? | |
| pipeline.publishedAt | timestamp? | |
| pipeline.frozenBy | string? | admin uid or 'scheduler' |
| results.rankings | array | [{ uid, nickname, score, rank, division }] |
| results.promotions | array | [{ uid, from, to, type, reason }] |
| results.totalParticipants | number | |
| rulesetVersion | string | 適用されたルールセットのバージョン |
| immutable | boolean | publish後 true |

### `job_runs/{runId}`

| Field | Type | Description |
|-------|------|-------------|
| runId | string | UUID |
| jobName | string | 'freeze' \| 'finalize' \| 'publish' |
| seasonYear | number | |
| seasonId | string | |
| startedAt | timestamp | |
| finishedAt | timestamp? | |
| status | string | 'running' \| 'success' \| 'failed' |
| error | string? | |
| stats | map? | { eventsProcessed, promotionsApplied, etc. } |

## State Transitions

### Pipeline Status
```
draft → frozen → finalized → published
```
- draft: 初期状態、イベント追加可能
- frozen: イベント固定、変更不可
- finalized: 昇格判定完了
- published: 公開、immutable=true

### 級位 (kyuiRankId)
```
none → kyui_10 → kyui_9 → kyui_8 → kyui_7 → kyui_6
```
- 即時昇級（検定合格時）
- 1回1段階のみ
- 六級(kyui_6)が最高位、到達で danEligible=true

### 段位 (danRankId)
```
none → dan_1 → dan_2 → dan_3 → dan_4 → dan_5 → dan_6
```
- 季末finalize時のみ
- danEligible必須
- 1回1段階のみ
- dan_6到達で denEligible=true

## Replaced Collections Mapping

| Old | New | Notes |
|-----|-----|-------|
| seasons | season_calendars + season_snapshots | 節気ベースに変更 |
| entries | events (match type) | エントリー概念→イベント記録 |
| rankings | season_snapshots.results.rankings | スナップショット内に統合 |
| banzukeSnapshots | season_snapshots | 統合 |
| titles | user_progress.denUtaRankId | 進捗に統合 |
| userStats | user_progress | 進捗に統合 |
| dailyReflections | (検討中: 維持 or user_progress.seasons内に統合) | |
