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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative max-w-2xl w-full animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="absolute -top-12 right-0 rounded-full p-2 h-auto bg-white/20 hover:bg-white/40 text-white"
                >
                    <X size={24} />
                </Button>

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info" className="font-bold bg-white/90">
                        {poem.order}番
                    </Badge>
                    <Text className="text-white font-medium">{poem.author}</Text>
                </div>

                {/* Manga Image */}
                <img
                    src={mangaPath}
                    alt={`${poem.order}番 ${poem.yomi} - マンガ解説`}
                    className="w-full rounded-lg shadow-2xl"
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
