/**
 * 108: 不具合詳細ページ（コメント付き）
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/PageStates';
import { getBugPosts, updateBugStatus, getComments, addComment } from '@/services/board.service';
import type { BoardPost, BoardComment, BugStatus } from '@/types/board';
import { BUG_STATUS_LABELS, BUG_TARGET_AREA_LABELS, BUG_FREQUENCY_LABELS } from '@/types/board';

const ALL_STATUSES: BugStatus[] = ['new', 'need_info', 'confirmed', 'in_progress', 'fixed', 'closed'];

export function BugDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { isAdmin, siteRole, user, profile } = useAuthContext();
  const isInner = siteRole === 'tester' || siteRole === 'admin';

  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const [posts, cmts] = await Promise.all([
        getBugPosts(),
        getComments(postId),
      ]);
      const found = posts.find(p => p.id === postId);
      setPost(found || null);
      setComments(cmts);
    } catch {
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isInner) {
    return (
      <Container size="sm" className="py-12">
        <Card><Text color="muted" className="text-center py-8">アクセス権限がありません</Text></Card>
      </Container>
    );
  }

  if (loading) return <Container size="md" className="py-8"><LoadingState /></Container>;

  if (!post) {
    return (
      <Container size="sm" className="py-12">
        <Card>
          <div className="text-center py-8">
            <Text color="muted">投稿が見つかりません</Text>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/bulletin?tab=bugroom')}>戻る</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const handleStatusChange = async (status: BugStatus) => {
    await updateBugStatus(post.id, status);
    loadData();
  };

  const handleAddComment = async () => {
    if (!commentBody.trim() || !postId) return;
    setSubmitting(true);
    try {
      await addComment({
        postId,
        body: commentBody.trim(),
        createdByUserId: user!.uid,
        createdByNickname: profile?.nickname || '不明',
      });
      setCommentBody('');
      const cmts = await getComments(postId);
      setComments(cmts);
    } finally {
      setSubmitting(false);
    }
  };

  const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);

  return (
    <Container size="md" className="py-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/bulletin?tab=bugroom')}>
        ← 不具合一覧へ
      </Button>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {post.status && <Badge variant="info">{BUG_STATUS_LABELS[post.status]}</Badge>}
          {post.targetArea && <Badge variant="outline">{BUG_TARGET_AREA_LABELS[post.targetArea]}</Badge>}
          {post.frequency && <Badge variant="secondary">{BUG_FREQUENCY_LABELS[post.frequency]}</Badge>}
        </div>

        <Heading as="h2" size="h2">{post.title}</Heading>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>報告者: {post.createdByNickname || '不明'}</span>
          <span>{createdAt.toLocaleString('ja-JP')}</span>
        </div>

        {/* 詳細フィールド */}
        <div className="space-y-3 text-sm">
          {post.targetPage && (
            <div><Text size="xs" color="muted">対象画面</Text><Text>{post.targetPage}</Text></div>
          )}
          {post.steps && (
            <div><Text size="xs" color="muted">再現手順</Text><pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">{post.steps}</pre></div>
          )}
          {post.expected && (
            <div><Text size="xs" color="muted">期待する動作</Text><Text>{post.expected}</Text></div>
          )}
          {post.actual && (
            <div><Text size="xs" color="muted">実際の動作</Text><Text>{post.actual}</Text></div>
          )}
        </div>

        {/* 管理者用ステータス変更 */}
        {isAdmin && post.status && (
          <div className="pt-3 border-t">
            <Text size="xs" color="muted" className="mb-2">ステータス変更</Text>
            <div className="flex gap-1 flex-wrap">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={post.status === s}
                  className={`text-xs px-2 py-1 rounded border ${
                    post.status === s
                      ? 'bg-gray-200 text-gray-500 cursor-default'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {BUG_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* コメントセクション */}
      <Card className="p-4">
        <Heading as="h3" size="h3" className="mb-3">コメント ({comments.length})</Heading>

        {comments.length === 0 ? (
          <Text size="sm" color="muted">まだコメントはありません</Text>
        ) : (
          <div className="space-y-3 mb-4">
            {comments.map(c => {
              const cAt = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
              return (
                <div key={c.id} className="border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{c.createdByNickname || '不明'}</span>
                    <span>{cAt.toLocaleString('ja-JP')}</span>
                  </div>
                  <Text size="sm" className="mt-1 whitespace-pre-wrap">{c.body}</Text>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            className="flex-1 border rounded px-2 py-1.5 text-sm"
            rows={2}
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            placeholder="コメントを追加..."
          />
          <Button size="sm" onClick={handleAddComment} disabled={submitting || !commentBody.trim()}>
            {submitting ? '...' : '送信'}
          </Button>
        </div>
      </Card>
    </Container>
  );
}
