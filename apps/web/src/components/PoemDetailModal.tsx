import { X } from 'lucide-react';
import type { Poem } from '@/types/poem';
import { AITutor } from './AITutor';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PoemDetailModalProps {
    poem: Poem;
    onClose: () => void;
}

export function PoemDetailModal({ poem, onClose }: PoemDetailModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-100 bg-white/90 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <Badge variant="info" className="font-bold">
                            {poem.order}番
                        </Badge>
                        <Heading as="h3" size="h4" className="m-0 text-gray-800">
                            {poem.author}
                        </Heading>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full p-2 h-auto hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Poem Text */}
                    <div className="text-center space-y-6">
                        <div className="space-y-2">
                            <Text size="sm" className="font-bold text-karuta-tansei uppercase tracking-wider">上の句</Text>
                            <p className="text-2xl font-serif font-medium text-gray-900 leading-relaxed">
                                {poem.yomi}
                            </p>
                            <Text size="sm" color="muted">{poem.yomiKana}</Text>
                        </div>

                        <div className="w-16 h-px bg-gray-200 mx-auto" />

                        <div className="space-y-2">
                            <Text size="sm" className="font-bold text-karuta-accent uppercase tracking-wider">下の句</Text>
                            <p className="text-2xl font-serif font-medium text-gray-900 leading-relaxed">
                                {poem.tori}
                            </p>
                            <Text size="sm" color="muted">{poem.toriKana}</Text>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
                            <Text size="xs" color="muted" className="mb-1 block">決まり字</Text>
                            <p className="font-bold text-xl text-gray-900 mb-1">{poem.kimariji}</p>
                            <Badge variant="outline" className="text-xs bg-white">
                                {poem.kimarijiCount}字
                            </Badge>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100 flex flex-col justify-center items-center">
                            <Text size="xs" color="muted" className="mb-1 block">歌番号</Text>
                            <p className="font-bold text-xl text-gray-900">No. {poem.order}</p>
                        </div>
                    </div>

                    {/* AI Tutor Integration */}
                    <div className="pt-2">
                        <AITutor poemId={poem.poemId} className="w-full" />
                        <Text size="xs" color="muted" align="center" className="mt-3">
                            AIがこの歌の背景や覚え方を解説します
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
}
