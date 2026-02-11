import * as functions from 'firebase-functions';
import OpenAI from 'openai';

// Initialize OpenAI client
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.apikey;
    if (!apiKey) {
        console.warn('OpenAI API Key not found');
        return null;
    }
    return new OpenAI({ apiKey });
};

interface StatsData {
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
    stats: StatsData;
}

interface AnalyzeStatsResponse {
    analysis: string;
    source?: string;
}

export const analyzeStats = functions.region('asia-northeast1').https.onCall(
    async (data: AnalyzeStatsRequest, context): Promise<AnalyzeStatsResponse> => {
        // 1. Authentication Check
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                '認証が必要です。'
            );
        }

        const { stats } = data;

        // 2. Validation
        if (!stats || !stats.overall) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                '統計データは必須です。'
            );
        }

        // 3. Call LLM
        const openai = getOpenAIClient();
        if (!openai) {
            // Mock response if API key is not set
            return {
                analysis: generateMockAnalysis(stats),
                source: 'Mock System',
            };
        }

        try {
            const systemPrompt = `あなたは「競技かるた」の熟練コーチです。
ユーザーの練習データを分析し、具体的で実践的なアドバイスを提供してください。
以下の点に注目して分析してください：
1. 全体的な傾向と改善点
2. 決まり字別の得意・不得意
3. 苦手な札への対策
4. 次の練習で重点的に取り組むべきこと

口調は励ますようなトーンで、具体的な行動に落とし込めるアドバイスをしてください。
回答は300文字程度でまとめてください。`;

            const userPrompt = buildUserPrompt(stats);

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 600,
            });

            const analysis = completion.choices[0]?.message?.content || '分析を生成できませんでした。';

            return {
                analysis,
                source: 'AI (GPT-4o)',
            };

        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'AI分析の生成中にエラーが発生しました。'
            );
        }
    }
);

function buildUserPrompt(stats: StatsData): string {
    const { overall, byKimariji, weakPoems } = stats;

    let prompt = `
【練習データ】
- 練習回数: ${overall.totalSessions}回
- 総問題数: ${overall.totalQuestions}問
- 正答率: ${overall.accuracy}%
- 平均反応時間: ${overall.avgResponseMs}ms

【決まり字別の成績】
`;

    byKimariji.forEach(k => {
        prompt += `- ${k.kimarijiCount}字決まり: 正答率${k.accuracy}%（${k.totalAttempts}回挑戦）\n`;
    });

    if (weakPoems.length > 0) {
        prompt += `
【苦手な札 TOP5】
`;
        weakPoems.slice(0, 5).forEach((p, i) => {
            prompt += `${i + 1}. ${p.poemNumber}番「${p.kimariji}」(${p.kimarijiCount}字) - 正答率${p.accuracy}%\n`;
        });
    }

    prompt += `
上記のデータを分析して、練習のアドバイスをお願いします。`;

    return prompt;
}

function generateMockAnalysis(stats: StatsData): string {
    const { overall, byKimariji, weakPoems } = stats;

    let analysis = `【AI分析（デモモード）】\n\n`;

    // Overall assessment
    if (overall.accuracy >= 80) {
        analysis += `素晴らしい成績です！正答率${overall.accuracy}%は上級者レベルです。\n`;
    } else if (overall.accuracy >= 60) {
        analysis += `順調に上達しています。正答率${overall.accuracy}%から更に伸ばしましょう。\n`;
    } else {
        analysis += `まだ伸びしろがあります。${overall.totalSessions}回の練習で着実に力をつけています。\n`;
    }

    // Kimariji advice
    const weakKimariji = byKimariji.filter(k => k.accuracy < 60 && k.totalAttempts > 0);
    if (weakKimariji.length > 0) {
        analysis += `\n${weakKimariji.map(k => k.kimarijiCount).join('字、')}字決まりを重点的に練習しましょう。\n`;
    }

    // Weak poems
    if (weakPoems.length > 0) {
        analysis += `\n苦手な札（${weakPoems.slice(0, 3).map(p => p.poemNumber + '番').join('、')}）を集中的に覚えると効果的です。`;
    }

    return analysis;
}
