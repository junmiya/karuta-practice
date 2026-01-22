import { useState } from 'react';
import { Bot, X, Loader2, Sparkles, GraduationCap, BookOpen, MessageCircle } from 'lucide-react';
import { getPoemExplanation } from '@/services/ai.service';

interface AITutorProps {
    poemId: string;
    className?: string;
}

export function AITutor({ poemId, className = '' }: AITutorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [mode, setMode] = useState<'simple' | 'detailed' | 'memorization'>('simple');
    const [error, setError] = useState<string | null>(null);

    const handleAskAI = async (selectedMode: typeof mode = mode) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getPoemExplanation(poemId, selectedMode);
            setExplanation(result.explanation);
        } catch (err) {
            setError('解説の生成に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    const ModeButton = ({ value, label, icon: Icon }: { value: typeof mode, label: string, icon: any }) => (
        <button
            onClick={() => {
                setMode(value);
                if (explanation) handleAskAI(value);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${mode === value
                    ? 'bg-karuta-tansei text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className={className}>
            {/* Trigger Button */}
            <button
                onClick={() => {
                    setIsOpen(true);
                    if (!explanation) handleAskAI();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-karuta-tansei to-blue-400 text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
                <Sparkles size={18} />
                <span className="font-bold">AI解説を聞く</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10 duration-300">

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-blue-50/50 rounded-t-2xl">
                            <div className="flex items-center gap-2 text-karuta-tansei">
                                <Bot className="w-6 h-6" />
                                <h3 className="font-bold text-lg">AI 専属チューター</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Selection */}
                        <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100">
                            <ModeButton value="simple" label="やさしく" icon={MessageCircle} />
                            <ModeButton value="memorization" label="覚え方" icon={GraduationCap} />
                            <ModeButton value="detailed" label="詳しく" icon={BookOpen} />
                        </div>

                        {/* Content Content */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-karuta-tansei" />
                                    <p className="text-sm font-medium animate-pulse">AIが解説を作成中...</p>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full py-8 text-red-500 gap-2">
                                    <p>{error}</p>
                                    <button onClick={() => handleAskAI()} className="text-sm underline hover:text-red-700">
                                        再試行する
                                    </button>
                                </div>
                            ) : (
                                <div className="prose prose-blue max-w-none">
                                    {explanation ? (
                                        <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
                                            {explanation}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center">
                            <p className="text-xs text-gray-400">
                                AIによる生成コンテンツのため、誤りが含まれる可能性があります。
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
