import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

// Initialize OpenAI client
// Note: API Key should be set in environment variables
// firebase functions:config:set openai.apikey="SK-..."
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.apikey;
    if (!apiKey) {
        console.warn('OpenAI API Key not found');
        return null;
    }
    return new OpenAI({ apiKey });
};

interface PoemData {
    order?: number;
    yomi?: string;
    tori?: string;
    kimariji?: string;
    author?: string;
}

interface ExplanationRequest {
    poemId: string;
    poemData?: PoemData; // Poem data passed from client
    question?: string; // Optional user question
    mode?: 'simple' | 'detailed' | 'memorization';
}

interface ExplanationResponse {
    explanation: string;
    source?: string; // e.g. "AI (GPT-4o)"
}

export const getPoemExplanation = functions.region('asia-northeast1').https.onCall(
    async (data: ExplanationRequest, context): Promise<ExplanationResponse> => {
        // 1. Authentication Check
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                '認証が必要です。'
            );
        }

        const { poemId, poemData: clientPoemData, question, mode = 'simple' } = data;

        // 2. Validation
        if (!poemId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'PoemIDは必須です。'
            );
        }

        // 3. Get Poem Data - try Firestore first, fall back to client data
        let poemData: PoemData | undefined;

        const poemDoc = await admin.firestore().collection('poems').doc(poemId).get();
        if (poemDoc.exists) {
            poemData = poemDoc.data() as PoemData;
        } else if (clientPoemData) {
            // Use data passed from client
            poemData = clientPoemData;
        } else {
            throw new functions.https.HttpsError(
                'not-found',
                '指定された歌が見つかりません。'
            );
        }

        // 4. Call LLM
        const openai = getOpenAIClient();
        if (!openai) {
            // Mock response if API key is not set (for development)
            return {
                explanation: `【AI解説（デモモード）】
APIキーが設定されていないため、モック応答を返しています。
歌番号: ${poemData?.order || poemId}
上の句: ${poemData?.yomi || '(不明)'}
下の句: ${poemData?.tori || '(不明)'}
決まり字: ${poemData?.kimariji || '(不明)'}
作者: ${poemData?.author || '(不明)'}

（実際のAI解説では、この歌の意味や背景、覚え方などがここに表示されます）`,
                source: 'Mock System',
            };
        }

        try {
            const systemPrompt = `あなたは「競技かるた」の博識で親切な指導者（AIチューター）です。
ユーザー（初心者〜中級者）に対して、百人一首の歌の解説や覚え方を教えてください。
口調は丁寧で励ますようなトーンを心がけてください。`;

            const userPrompt = `
以下の歌について解説してください。

【歌情報】
番号: ${poemData?.order || poemId}
上の句（読み札）: ${poemData?.yomi || '(不明)'}
下の句（取り札）: ${poemData?.tori || '(不明)'}
決まり字: ${poemData?.kimariji || '(不明)'}
作者: ${poemData?.author || '(不明)'}

【リクエスト】
モード: ${mode === 'simple' ? '初心者向けに分かりやすく簡潔に' : mode === 'memorization' ? '覚え方や決まり字のコツを中心に' : '歴史的背景も含めて詳細に'}
${question ? `ユーザーからの質問: "${question}"` : ''}
`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o", // or gpt-3.5-turbo if cost is a concern
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 500,
            });

            const explanation = completion.choices[0]?.message?.content || '解説を生成できませんでした。';

            return {
                explanation,
                source: 'AI (GPT-4o)',
            };

        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'AI解説の生成中にエラーが発生しました。'
            );
        }
    }
);
