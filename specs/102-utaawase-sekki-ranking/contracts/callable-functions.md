# API Contracts: Callable Functions

## adminSaveRuleset

**Input**:
```typescript
{
  yamlContent: string;  // YAML原文
}
```

**Output**:
```typescript
{
  success: boolean;
  version: string;
  errors?: string[];  // validation errors
}
```

## adminSaveSeasonCalendar

**Input**:
```typescript
{
  year: number;
  markers: {
    risshun: string;      // ISO 8601
    rikka: string;
    risshuu: string;
    rittou: string;
    risshun_next: string;
  };
}
```

**Output**:
```typescript
{
  success: boolean;
  periods: {
    spring: { startAt: string; endAt: string };
    summer: { startAt: string; endAt: string };
    autumn: { startAt: string; endAt: string };
    winter: { startAt: string; endAt: string };
  };
  errors?: string[];
}
```

## submitKyuiExam

**Input**:
```typescript
{
  kimarijiMax: number;    // 対象決まり字上限 (1-6)
  isAllCards: boolean;     // 全札フラグ
  total: number;           // 出題数
  correct: number;         // 正解数
  durationSeconds: number; // 所要時間
  answers: Array<{
    poemId: string;
    selectedPoemId: string;
    isCorrect: boolean;
    elapsedMs: number;
  }>;
}
```

**Output**:
```typescript
{
  eventId: string;
  passed: boolean;
  accuracy: number;
  previousRank: string;
  newRank: string | null;     // null if not promoted
  danEligible: boolean;
}
```

## adminFreezeSeason / adminFinalizeSeason / adminPublishSeason

**Input**:
```typescript
{
  seasonYear: number;
  seasonId: 'spring' | 'summer' | 'autumn' | 'winter';
}
```

**Output**:
```typescript
{
  success: boolean;
  snapshotId: string;
  pipeline: {
    status: 'frozen' | 'finalized' | 'published';
    frozenAt?: string;
    finalizedAt?: string;
    publishedAt?: string;
  };
  jobRunId: string;
  error?: string;
}
```

## submitOfficialSession (既存拡張)

**追加Output fields**:
```typescript
{
  // ... existing fields ...
  eventId?: string;           // 生成されたmatchイベントID
  cumulativeScore?: number;   // シーズン累積スコア
}
```
