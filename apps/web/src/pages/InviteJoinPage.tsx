/**
 * 105: 招待参加ページ — リンク経由で招待に参加
 */
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Container } from '@/components/ui/Container';
import * as inviteService from '@/services/invite.service';
import type { GetInviteInfoOutput } from '@/types/invite';

export function InviteJoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const inviteId = searchParams.get('id') || undefined;

  const [inviteInfo, setInviteInfo] = useState<GetInviteInfoOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteId) {
      setInviteInfo({ found: false, status: 'not_found' });
      setLoading(false);
      return;
    }

    inviteService.getInviteInfo(inviteId)
      .then(setInviteInfo)
      .catch(() => {
        setError('招待情報の取得に失敗しました');
      })
      .finally(() => setLoading(false));
  }, [inviteId]);

  const handleJoin = async () => {
    if (!inviteId) return;

    // 認証チェック
    if (inviteInfo?.requiresAuth && !user) {
      const returnUrl = `/invite/join?id=${encodeURIComponent(inviteId)}`;
      navigate(`/profile?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setJoining(true);
    try {
      const result = await inviteService.joinInvite(inviteId);
      navigate(result.redirectUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '参加に失敗しました';
      if (message.includes('期限切れ')) {
        setInviteInfo({ found: true, status: 'expired' });
      } else if (message.includes('見つかりません')) {
        setInviteInfo({ found: false, status: 'not_found' });
      } else if (message.includes('ログイン')) {
        const returnUrl = `/invite/join?id=${encodeURIComponent(inviteId!)}`;
        navigate(`/profile?returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        setError(message);
      }
    } finally {
      setJoining(false);
    }
  };

  // ローディング
  if (loading) {
    return (
      <Container size="sm" className="py-12 text-center">
        <Text color="muted">招待情報を確認中...</Text>
      </Container>
    );
  }

  // エラー・期限切れ・見つからない
  if (error || !inviteInfo?.found || inviteInfo?.status === 'not_found') {
    return (
      <Container size="sm" className="py-12">
        <Card padding="lg" centered>
          <Heading as="h2" size="h3" className="mb-3">
            招待が見つかりません
          </Heading>
          <Text color="muted" className="mb-6">
            {error || 'この招待リンクは無効です。URLが正しいか確認してください。'}
          </Text>
          <Button variant="primary" onClick={() => navigate('/')}>
            一首ためす
          </Button>
        </Card>
      </Container>
    );
  }

  if (inviteInfo.status === 'expired') {
    return (
      <Container size="sm" className="py-12">
        <Card padding="lg" centered>
          <Heading as="h2" size="h3" className="mb-3">
            期限切れです
          </Heading>
          <Text color="muted" className="mb-6">
            この招待リンクの有効期限が切れています。招待者に新しいリンクを作成してもらってください。
          </Text>
          <Button variant="primary" onClick={() => navigate('/')}>
            一首ためす
          </Button>
        </Card>
      </Container>
    );
  }

  // 有効な招待
  return (
    <Container size="sm" className="py-12">
      <Card padding="lg" centered>
        <Heading as="h2" size="h3" className="mb-3">
          招待
        </Heading>
        <Text className="mb-1">
          <span className="font-medium">{inviteInfo.targetModeLabel}</span>モードへの招待です
        </Text>
        <Text color="muted" className="mb-6">
          同じ条件で始めます
        </Text>
        {inviteInfo.requiresAuth && !user && (
          <Text size="sm" color="muted" className="mb-4">
            ※ {inviteInfo.targetModeLabel}モードにはログインが必要です
          </Text>
        )}
        <Button
          variant="primary"
          size="lg"
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? '参加中...' : '参加する'}
        </Button>
      </Card>
    </Container>
  );
}
