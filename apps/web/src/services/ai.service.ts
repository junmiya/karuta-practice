import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { getPoemById } from './poems.service';

interface PoemData {
    order?: number;
    yomi?: string;
    tori?: string;
    kimariji?: string;
    author?: string;
}

interface ExplanationRequest {
    poemId: string;
    poemData?: PoemData;
    question?: string;
    mode?: 'simple' | 'detailed' | 'memorization';
}

interface ExplanationResponse {
    explanation: string;
    source?: string;
}

// Stats Analysis types
export interface StatsDataForAnalysis {
    overall: {
        totalSessions: number;
        totalQuestions: number;
        accuracy: number;
        avgResponseMs: number;
    };
    byKimariji: Array<{
        kimarijiCount: number;
        accuracy: number;
        totalAttempts: number;
    }>;
    weakPoems: Array<{
        poemNumber: number;
        kimariji: string;
        kimarijiCount: number;
        accuracy: number;
        totalAttempts: number;
    }>;
}

interface AnalyzeStatsRequest {
    stats: StatsDataForAnalysis;
}

interface AnalyzeStatsResponse {
    analysis: string;
    source?: string;
}

/**
 * Get AI explanation for a poem
 */
export async function getPoemExplanation(
    poemId: string,
    mode: 'simple' | 'detailed' | 'memorization' = 'simple',
    question?: string
): Promise<ExplanationResponse> {
    const getExplanation = httpsCallable<ExplanationRequest, ExplanationResponse>(
        functions,
        'getPoemExplanation'
    );

    // Get poem data from local JSON to pass to Cloud Function
    const poem = getPoemById(poemId);
    const poemData: PoemData | undefined = poem ? {
        order: poem.order,
        yomi: poem.yomi,
        tori: poem.tori,
        kimariji: poem.kimariji,
        author: poem.author,
    } : undefined;

    try {
        const result = await getExplanation({ poemId, poemData, mode, question });
        return result.data;
    } catch (error) {
        console.error('AI Service Error:', error);
        throw new Error('AI解説の取得に失敗しました。');
    }
}

/**
 * Get AI analysis for practice stats
 */
export async function analyzeStats(stats: StatsDataForAnalysis): Promise<AnalyzeStatsResponse> {
    const analyze = httpsCallable<AnalyzeStatsRequest, AnalyzeStatsResponse>(
        functions,
        'analyzeStats'
    );

    try {
        const result = await analyze({ stats });
        return result.data;
    } catch (error) {
        console.error('AI Stats Analysis Error:', error);
        throw new Error('AI分析の取得に失敗しました。');
    }
}
