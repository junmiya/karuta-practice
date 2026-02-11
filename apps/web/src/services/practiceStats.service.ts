/**
 * 練習統計サービス
 *
 * 公式競技以外の練習データを保存・集計
 * - 練習結果の保存
 * - 札別統計（全札/決まり字別/苦手）
 * - AI分析用データ提供
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Question } from '@/types/practice';

// =============================================================================
// 型定義
// =============================================================================

export interface PracticeResultRound {
  poemId: string;
  isCorrect: boolean;
  elapsedMs: number;
  kimarijiCount: number;
}

export interface PracticeResultDoc {
  uid: string;
  createdAt: Timestamp;
  mode: 'practice' | 'practice12' | 'official';
  questionCount: number;
  correctCount: number;
  totalElapsedMs: number;
  avgMs: number;
  rounds: PracticeResultRound[];
  filter?: {
    kimarijiCounts?: number[];
  };
}

export interface PoemStatsData {
  poemId: string;
  poemNumber: number; // 1-100
  kimarijiCount: number;
  kimariji: string;
  yomi: string;
  tori: string;
  author: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // 0-100
  avgResponseMs: number;
  lastAttemptAt?: Date;
}

export interface KimarijiStatsData {
  kimarijiCount: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgResponseMs: number;
  poemCount: number; // その決まり字の札数
}

export interface OverallPracticeStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  avgResponseMs: number;
  lastPracticeAt?: Date;
  // 日別推移
  dailyStats: Array<{
    date: string;
    sessions: number;
    questions: number;
    correct: number;
    accuracy: number;
  }>;
}

export interface AllPracticeStats {
  overall: OverallPracticeStats;
  byKimariji: KimarijiStatsData[];
  byPoem: PoemStatsData[];
  weakPoems: PoemStatsData[];
}

// =============================================================================
// 練習結果の保存
// =============================================================================

/**
 * 練習結果をFirestoreに保存
 */
export async function savePracticeResult(
  uid: string,
  mode: 'practice' | 'practice12' | 'official',
  questions: Question[],
  filter?: { kimarijiCounts?: number[] }
): Promise<string> {
  console.log('[practiceStats] Saving practice result for uid:', uid, 'mode:', mode);
  console.log('[practiceStats] Questions to save:', questions.length);

  const rounds: PracticeResultRound[] = questions
    .filter(q => q.answered && q.poem && q.poem.poemId)
    .map(q => ({
      poemId: q.poem.poemId,
      isCorrect: q.isCorrect === true,
      elapsedMs: typeof q.elapsedMs === 'number' ? q.elapsedMs : 0,
      kimarijiCount: typeof q.poem.kimarijiCount === 'number' ? q.poem.kimarijiCount : 1,
    }));

  console.log('[practiceStats] Rounds after filtering:', rounds.length);

  const correctCount = rounds.filter(r => r.isCorrect).length;
  const totalElapsedMs = rounds.reduce((sum, r) => sum + r.elapsedMs, 0);

  // Build the document without undefined values
  const resultDoc = {
    uid,
    createdAt: Timestamp.now(),
    mode,
    questionCount: rounds.length,
    correctCount,
    totalElapsedMs,
    avgMs: rounds.length > 0 ? Math.round(totalElapsedMs / rounds.length) : 0,
    rounds,
    // Only include filter if it has valid data
    ...(filter?.kimarijiCounts?.length ? { filter } : {}),
  };

  const docRef = doc(collection(db, 'practiceResults'));
  await setDoc(docRef, resultDoc);
  console.log('[practiceStats] Saved practice result with id:', docRef.id);
  return docRef.id;
}

// =============================================================================
// 統計集計
// =============================================================================

/**
 * ユーザーの練習結果を取得
 */
export async function getUserPracticeResults(
  uid: string,
  limitCount: number = 100
): Promise<PracticeResultDoc[]> {
  console.log('[practiceStats] Fetching practice results for uid:', uid);

  const q = query(
    collection(db, 'practiceResults'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  console.log('[practiceStats] Found', snapshot.docs.length, 'practice results');
  return snapshot.docs.map(doc => doc.data() as PracticeResultDoc);
}

/**
 * 全練習統計を計算
 */
export async function calculateAllPracticeStats(
  uid: string,
  poemsData: Map<string, {
    poemId: string;
    poemNumber: number;
    kimarijiCount: number;
    kimariji: string;
    yomi: string;
    tori: string;
    author: string;
  }>
): Promise<AllPracticeStats> {
  const results = await getUserPracticeResults(uid, 200);

  // 札別統計を集計
  const poemStatsMap = new Map<string, {
    total: number;
    correct: number;
    totalMs: number;
    lastAt?: Date;
  }>();

  // 決まり字別統計を集計
  const kimarijiStatsMap = new Map<number, {
    total: number;
    correct: number;
    totalMs: number;
  }>();

  // 1-6の決まり字を初期化
  for (let i = 1; i <= 6; i++) {
    kimarijiStatsMap.set(i, { total: 0, correct: 0, totalMs: 0 });
  }

  // 日別統計
  const dailyMap = new Map<string, {
    sessions: number;
    questions: number;
    correct: number;
  }>();

  // 全結果を集計
  for (const result of results) {
    // 日別集計
    const dateKey = result.createdAt.toDate().toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { sessions: 0, questions: 0, correct: 0 });
    }
    const daily = dailyMap.get(dateKey)!;
    daily.sessions++;
    daily.questions += result.questionCount;
    daily.correct += result.correctCount;

    // ラウンド別集計
    for (const round of result.rounds) {
      // 札別
      if (!poemStatsMap.has(round.poemId)) {
        poemStatsMap.set(round.poemId, { total: 0, correct: 0, totalMs: 0 });
      }
      const poemStats = poemStatsMap.get(round.poemId)!;
      poemStats.total++;
      if (round.isCorrect) poemStats.correct++;
      poemStats.totalMs += round.elapsedMs;
      poemStats.lastAt = result.createdAt.toDate();

      // 決まり字別
      const kimStats = kimarijiStatsMap.get(round.kimarijiCount);
      if (kimStats) {
        kimStats.total++;
        if (round.isCorrect) kimStats.correct++;
        kimStats.totalMs += round.elapsedMs;
      }
    }
  }

  // 全体統計
  const totalSessions = results.length;
  const totalQuestions = results.reduce((sum, r) => sum + r.questionCount, 0);
  const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
  const totalMs = results.reduce((sum, r) => sum + r.totalElapsedMs, 0);

  const overall: OverallPracticeStats = {
    totalSessions,
    totalQuestions,
    totalCorrect,
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    avgResponseMs: totalQuestions > 0 ? Math.round(totalMs / totalQuestions) : 0,
    lastPracticeAt: results[0]?.createdAt.toDate(),
    dailyStats: Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        sessions: stats.sessions,
        questions: stats.questions,
        correct: stats.correct,
        accuracy: stats.questions > 0 ? Math.round((stats.correct / stats.questions) * 100) : 0,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14),
  };

  // 決まり字別統計（札数情報を追加）
  const kimarijiPoemCounts = [7, 42, 37, 6, 2, 6]; // 1字〜6字の札数
  const byKimariji: KimarijiStatsData[] = Array.from(kimarijiStatsMap.entries()).map(
    ([kimarijiCount, stats]) => ({
      kimarijiCount,
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      avgResponseMs: stats.total > 0 ? Math.round(stats.totalMs / stats.total) : 0,
      poemCount: kimarijiPoemCounts[kimarijiCount - 1],
    })
  );

  // 札別統計
  const byPoem: PoemStatsData[] = [];
  for (const [poemId, stats] of poemStatsMap) {
    const poemInfo = poemsData.get(poemId);
    if (!poemInfo) continue;

    byPoem.push({
      poemId,
      poemNumber: poemInfo.poemNumber,
      kimarijiCount: poemInfo.kimarijiCount,
      kimariji: poemInfo.kimariji,
      yomi: poemInfo.yomi,
      tori: poemInfo.tori,
      author: poemInfo.author,
      totalAttempts: stats.total,
      correctAttempts: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      avgResponseMs: stats.total > 0 ? Math.round(stats.totalMs / stats.total) : 0,
      lastAttemptAt: stats.lastAt,
    });
  }

  // 札番号順にソート
  byPoem.sort((a, b) => a.poemNumber - b.poemNumber);

  // 苦手札（正答率の低い順、最低3回以上挑戦したもの）
  const weakPoems = byPoem
    .filter(p => p.totalAttempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 20);

  return {
    overall,
    byKimariji,
    byPoem,
    weakPoems,
  };
}

// =============================================================================
// AI分析用
// =============================================================================

/**
 * 苦手札のAI分析用プロンプトを生成
 */
export function generateWeakPoemAnalysisPrompt(poem: PoemStatsData): string {
  const accuracyLevel = poem.accuracy < 40 ? '非常に苦手' : poem.accuracy < 60 ? 'やや苦手' : '改善の余地あり';

  return `
この札についてアドバイスをお願いします：

【札情報】
- 番号: ${poem.poemNumber}番
- 上の句: ${poem.yomi}
- 下の句: ${poem.tori}
- 作者: ${poem.author}
- 決まり字: ${poem.kimariji}（${poem.kimarijiCount}字決まり）

【成績】
- 正答率: ${poem.accuracy}%（${poem.correctAttempts}/${poem.totalAttempts}回）
- 平均解答時間: ${poem.avgResponseMs}ms
- 判定: ${accuracyLevel}

以下の観点でアドバイスをください：
1. この札を覚えるためのコツ（上の句と下の句の関連付け）
2. 決まり字「${poem.kimariji}」で始まる他の札との区別方法
3. 練習のポイント
`.trim();
}
