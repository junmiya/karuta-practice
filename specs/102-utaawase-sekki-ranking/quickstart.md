# Quickstart: 歌合・節気別歌位確定システム

**Feature**: 102-utaawase-sekki-ranking

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)
- Firebase project: `karuta-banzuke`

## Development Setup

```bash
# Install dependencies
cd functions && npm install
cd ../apps/web && npm install

# Start Firebase emulators (Firestore + Functions)
firebase emulators:start --only firestore,functions

# Start frontend dev server
cd apps/web && npm run dev
```

## Seed Data

### 2026 Season Calendar

```json
{
  "year": 2026,
  "markers": {
    "risshun": "2026-02-04T05:02:00+09:00",
    "rikka": "2026-05-05T21:31:00+09:00",
    "risshuu": "2026-08-07T16:42:00+09:00",
    "rittou": "2026-11-07T13:52:00+09:00",
    "risshun_next": "2027-02-04T10:46:00+09:00"
  }
}
```

### Ruleset (minimal)

```yaml
version: "1.0.0"
kyui:
  - id: kyui_10
    label: 十級
    kimarijiMax: 1
    isAllCards: false
    accuracyMin: 0.8
  - id: kyui_9
    label: 九級
    kimarijiMax: 2
    isAllCards: false
    accuracyMin: 0.8
  # ... kyui_8 to kyui_7 ...
  - id: kyui_6
    label: 六級
    isAllCards: true
    accuracyMin: 0.8
dan:
  - id: dan_1
    label: 初段
    placementRule: top_half
    requiresOfficial: true
    requiresAllCards: true
  # ... dan_2 to dan_6 ...
promotion:
  noSkip: true
  oneStepPerEvaluation: true
evaluation:
  kyui: immediate
  dan: season_finalize
  den: season_finalize
```

## Key Endpoints (Cloud Functions Callable)

| Function | Purpose |
|----------|---------|
| `adminSaveRuleset` | ルールセット保存 |
| `adminSaveSeasonCalendar` | 節気カレンダー保存 |
| `submitKyuiExam` | 級位検定提出→即時昇級 |
| `submitOfficialSession` | 公式競技提出(既存) + matchイベント自動生成 |
| `adminFreezeSeason` | 季末freeze |
| `adminFinalizeSeason` | 季末finalize(昇格判定) |
| `adminPublishSeason` | 季末publish(スナップショット公開) |

## Testing

```bash
# Backend unit tests
cd functions && npm test

# Frontend build check
cd apps/web && npm run build
```

## Milestone Verification

- **M1**: AdminPage → 節気カレンダータブ → 2026年データ投入 → Firestore確認
- **M2**: OfficialPage → 50問完了 → Firestore `events` コレクションにmatchドキュメント確認
- **M3**: AdminPage → freeze/finalize/publish → `season_snapshots` 確認
- **M4**: Firestore Rules テスト → クライアント書込拒否確認
