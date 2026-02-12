/**
 * 108: 便りページ（瓦版 + 不具合の部屋）
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { LoadingState, EmptyState } from '@/components/ui/PageStates';
import { getKawarabanPosts, getBugPosts, createBugReport, createKawarabanPost, updateBugStatus, deleteBoardPost } from '@/services/board.service';
import type { BoardPost, PostType, BugStatus, BugTargetArea, BugFrequency } from '@/types/board';
import {
  POST_TYPE_LABELS,
  BUG_STATUS_LABELS,
  BUG_TARGET_AREA_LABELS,
  BUG_FREQUENCY_LABELS,
} from '@/types/board';

type TabValue = 'kawaraban' | 'bugroom';

const TAB_OPTIONS: { value: TabValue; label: string }[] = [
  { value: 'kawaraban', label: '瓦版' },
  { value: 'bugroom', label: '不具合の部屋' },
];

// 不具合ステータスのバッジ色
const BUG_STATUS_VARIANT: Record<BugStatus, string> = {
  new: 'danger',
  need_info: 'warning',
  confirmed: 'info',
  in_progress: 'accent',
  fixed: 'success',
  closed: 'secondary',
};

// 投稿タイプのバッジ色
const POST_TYPE_VARIANT: Record<PostType, string> = {
  external_news: 'info',
  system_news: 'accent',
  group_recruit: 'success',
  bug_report: 'danger',
};

export function BulletinBoardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, siteRole, isAdmin, profile, user } = useAuthContext();

  const isInner = siteRole === 'tester' || siteRole === 'admin';
  const initialTab = (searchParams.get('tab') as TabValue) || 'kawaraban';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルタ
  const [statusFilter, setStatusFilter] = useState<BugStatus | ''>('');
  const [areaFilter, setAreaFilter] = useState<BugTargetArea | ''>('');

  // 投稿フォーム
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'kawaraban' | 'bug'>('kawaraban');

  const canSeeBugRoom = isInner;
  const tabOptions = canSeeBugRoom ? TAB_OPTIONS : TAB_OPTIONS.filter(t => t.value !== 'bugroom');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'kawaraban') {
        const data = await getKawarabanPosts();
        setPosts(data);
      } else {
        const filters: { status?: BugStatus; targetArea?: BugTargetArea } = {};
        if (statusFilter) filters.status = statusFilter;
        if (areaFilter) filters.targetArea = areaFilter;
        const data = await getBugPosts(filters);
        setPosts(data);
      }
    } catch (err: any) {
      setError(err.message || '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, areaFilter]);

  useEffect(() => {
    if (isAuthenticated) loadPosts();
  }, [isAuthenticated, loadPosts]);

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setShowForm(false);
  };

  if (!isAuthenticated) {
    return (
      <Container size="sm" className="py-12">
        <Card>
          <div className="text-center py-8">
            <Text color="muted">ログインが必要です</Text>
            <Button className="mt-4" onClick={() => navigate('/profile')}>ログイン</Button>
          </div>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Heading as="h2" size="h2">便り</Heading>
        <div className="flex gap-2">
          {activeTab === 'kawaraban' && isAdmin && (
            <Button size="sm" onClick={() => { setFormMode('kawaraban'); setShowForm(true); }}>
              投稿する
            </Button>
          )}
          {activeTab === 'bugroom' && canSeeBugRoom && (
            <Button size="sm" onClick={() => { setFormMode('bug'); setShowForm(true); }}>
              不具合を報告
            </Button>
          )}
        </div>
      </div>

      <SegmentedControl options={tabOptions} value={activeTab} onChange={handleTabChange} size="md" />

      {/* フォーム */}
      {showForm && formMode === 'kawaraban' && (
        <KawarabanForm
          onSubmit={async (data) => {
            await createKawarabanPost({
              ...data,
              createdByUserId: user!.uid,
              createdByNickname: profile?.nickname || '不明',
            });
            setShowForm(false);
            loadPosts();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {showForm && formMode === 'bug' && (
        <BugReportForm
          onSubmit={async (data) => {
            await createBugReport({
              ...data,
              createdByUserId: user!.uid,
              createdByNickname: profile?.nickname || '不明',
            });
            setShowForm(false);
            loadPosts();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 不具合フィルタ */}
      {activeTab === 'bugroom' && !showForm && (
        <div className="flex gap-2 flex-wrap">
          <select
            className="text-xs border rounded px-2 py-1"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as BugStatus | '')}
          >
            <option value="">全ステータス</option>
            {(Object.keys(BUG_STATUS_LABELS) as BugStatus[]).map(s => (
              <option key={s} value={s}>{BUG_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className="text-xs border rounded px-2 py-1"
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value as BugTargetArea | '')}
          >
            <option value="">全機能</option>
            {(Object.keys(BUG_TARGET_AREA_LABELS) as BugTargetArea[]).map(a => (
              <option key={a} value={a}>{BUG_TARGET_AREA_LABELS[a]}</option>
            ))}
          </select>
        </div>
      )}

      {/* 一覧 */}
      {loading ? (
        <LoadingState message="便りを読み込み中..." />
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <Text color="muted">{error}</Text>
            <Button variant="secondary" size="sm" className="mt-2" onClick={loadPosts}>再読み込み</Button>
          </div>
        </Card>
      ) : posts.length === 0 ? (
        <EmptyState message={activeTab === 'kawaraban' ? 'まだ投稿がありません' : '不具合報告はありません'} />
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            activeTab === 'kawaraban'
              ? <KawarabanCard key={post.id} post={post} isAdmin={isAdmin} onDelete={async () => { await deleteBoardPost(post.id); loadPosts(); }} />
              : <BugCard key={post.id} post={post} isAdmin={isAdmin} onStatusChange={async (status) => { await updateBugStatus(post.id, status); loadPosts(); }} onClick={() => navigate(`/bulletin/bug/${post.id}`)} />
          ))}
        </div>
      )}
    </Container>
  );
}

// ===== 瓦版カード =====
function KawarabanCard({ post, isAdmin, onDelete }: { post: BoardPost; isAdmin: boolean; onDelete: () => void }) {
  const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.pinned && <Badge variant="accent">固定</Badge>}
            <Badge variant={(POST_TYPE_VARIANT[post.type] || 'secondary') as any}>
              {POST_TYPE_LABELS[post.type]}
            </Badge>
            {post.groupName && (
              <Text size="xs" color="muted">{post.groupName}</Text>
            )}
          </div>
          <Text weight="bold" className="truncate">{post.title}</Text>
          {post.body && <Text size="sm" color="muted" className="mt-1 line-clamp-2">{post.body}</Text>}
          <div className="flex items-center gap-2 mt-2">
            <Text size="xs" color="muted">{post.createdByNickname || '不明'}</Text>
            <Text size="xs" color="muted">{createdAt.toLocaleDateString('ja-JP')}</Text>
            {post.externalUrl && (
              <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-karuta-tansei hover:underline">
                外部リンク
              </a>
            )}
          </div>
        </div>
        {isAdmin && (
          <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500" title="削除">
            削除
          </button>
        )}
      </div>
    </Card>
  );
}

// ===== 不具合カード =====
function BugCard({ post, isAdmin, onStatusChange, onClick }: {
  post: BoardPost;
  isAdmin: boolean;
  onStatusChange: (status: BugStatus) => void;
  onClick: () => void;
}) {
  const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
  return (
    <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.status && (
              <Badge variant={(BUG_STATUS_VARIANT[post.status] || 'secondary') as any}>
                {BUG_STATUS_LABELS[post.status]}
              </Badge>
            )}
            {post.targetArea && (
              <Badge variant="outline">{BUG_TARGET_AREA_LABELS[post.targetArea]}</Badge>
            )}
          </div>
          <Text weight="bold" className="truncate">{post.title}</Text>
          <div className="flex items-center gap-2 mt-2">
            <Text size="xs" color="muted">{post.createdByNickname || '不明'}</Text>
            <Text size="xs" color="muted">{createdAt.toLocaleDateString('ja-JP')}</Text>
          </div>
        </div>
        {isAdmin && post.status && (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {post.status === 'new' && (
              <button onClick={() => onStatusChange('confirmed')} className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50">
                確認
              </button>
            )}
            {(post.status === 'confirmed' || post.status === 'in_progress') && (
              <button onClick={() => onStatusChange('fixed')} className="text-xs px-2 py-0.5 rounded border border-green-300 text-green-600 hover:bg-green-50">
                修正済
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== 瓦版投稿フォーム =====
function KawarabanForm({ onSubmit, onCancel }: {
  onSubmit: (data: { type: PostType; title: string; body?: string; externalUrl?: string; pinned?: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<PostType>('system_news');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type,
        title: title.trim(),
        body: body.trim() || undefined,
        externalUrl: externalUrl.trim() || undefined,
        pinned,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <Heading as="h3" size="h3">瓦版に投稿</Heading>
      <div>
        <label className="block text-xs text-gray-600 mb-1">種別</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm" value={type} onChange={e => setType(e.target.value as PostType)}>
          <option value="system_news">お知らせ</option>
          <option value="external_news">外部ニュース</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">タイトル</label>
        <input className="w-full border rounded px-2 py-1.5 text-sm" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="タイトル（80文字以内）" />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">本文</label>
        <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={4000} placeholder="本文（任意）" />
      </div>
      {type === 'external_news' && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">外部リンクURL</label>
          <input className="w-full border rounded px-2 py-1.5 text-sm" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." />
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
        <Text size="sm">ピン留め</Text>
      </label>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
          {submitting ? '送信中...' : '投稿する'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
      </div>
    </Card>
  );
}

// ===== 不具合報告フォーム =====
function BugReportForm({ onSubmit, onCancel }: {
  onSubmit: (data: {
    title: string;
    targetArea: BugTargetArea;
    targetPage?: string;
    steps?: string;
    expected?: string;
    actual?: string;
    envOs?: string;
    envBrowser?: string;
    envDevice?: string;
    frequency?: BugFrequency;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [targetArea, setTargetArea] = useState<BugTargetArea>('other');
  const [targetPage, setTargetPage] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [frequency, setFrequency] = useState<BugFrequency>('sometimes');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !targetArea) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        targetArea,
        targetPage: targetPage.trim() || undefined,
        steps: steps.trim() || undefined,
        expected: expected.trim() || undefined,
        actual: actual.trim() || undefined,
        frequency,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <Heading as="h3" size="h3">不具合を報告</Heading>
      <div>
        <label className="block text-xs text-gray-600 mb-1">対象機能 *</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm" value={targetArea} onChange={e => setTargetArea(e.target.value as BugTargetArea)}>
          {(Object.keys(BUG_TARGET_AREA_LABELS) as BugTargetArea[]).map(a => (
            <option key={a} value={a}>{BUG_TARGET_AREA_LABELS[a]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">タイトル *</label>
        <input className="w-full border rounded px-2 py-1.5 text-sm" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="簡潔に問題を記述" />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">再現手順</label>
        <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={3} value={steps} onChange={e => setSteps(e.target.value)} placeholder="1. ○○を開く&#10;2. ○○をタップ&#10;3. ..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">期待する動作</label>
          <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={expected} onChange={e => setExpected(e.target.value)} placeholder="本来はこうなるべき" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">実際の動作</label>
          <textarea className="w-full border rounded px-2 py-1.5 text-sm" rows={2} value={actual} onChange={e => setActual(e.target.value)} placeholder="実際にはこうなった" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">発生頻度</label>
        <select className="w-full border rounded px-2 py-1.5 text-sm" value={frequency} onChange={e => setFrequency(e.target.value as BugFrequency)}>
          {(Object.keys(BUG_FREQUENCY_LABELS) as BugFrequency[]).map(f => (
            <option key={f} value={f}>{BUG_FREQUENCY_LABELS[f]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">対象画面</label>
        <input className="w-full border rounded px-2 py-1.5 text-sm" value={targetPage} onChange={e => setTargetPage(e.target.value)} placeholder="URL or 画面名" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
          {submitting ? '送信中...' : '報告する'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
      </div>
    </Card>
  );
}
