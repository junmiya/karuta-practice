import { X } from 'lucide-react';
import type { Poem } from '@/types/poem';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PoemDetailModalProps {
    poem: Poem;
    onClose: () => void;
}

export function PoemDetailModal({ poem, onClose }: PoemDetailModalProps) {
    const mangaPath = `/manga/${poem.order.toString().padStart(3, '0')}.jpg`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-1 px-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="info" className="font-bold bg-white/90 text-xs">
                            {poem.order}番
                        </Badge>
                        <Text className="text-white font-medium text-sm">{poem.author}</Text>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full p-1.5 h-auto bg-white/20 hover:bg-white/40 text-white"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Manga Image */}
                <img
                    src={mangaPath}
                    alt={`${poem.order}番 ${poem.yomi} - マンガ解説`}
                    className="w-full h-auto max-h-[calc(95vh-3rem)] object-contain rounded-lg shadow-2xl"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement?.querySelector('.manga-fallback')?.classList.remove('hidden');
                    }}
                />

                {/* Fallback if image not found */}
                <div className="manga-fallback hidden bg-white rounded-lg p-8 text-center">
                    <Text color="muted" className="mb-4">マンガ画像は準備中です</Text>
                    <div className="space-y-2">
                        <Heading as="h3" size="h4">{poem.kimariji}</Heading>
                        <Text>{poem.yomi}</Text>
                        <Text color="muted">{poem.tori}</Text>
                    </div>
                </div>
            </div>
        </div>
    );
}
