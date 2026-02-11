/**
 * 107: 内弟子QR入口
 * /join/uchideshi?token=<secret> からアクセス
 */
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { joinAsUchideshi } from '@/services/billing.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/PageStates';

export function UchideshiJoinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading, loginWithGoogle } = useAuthContext();

  const token = searchParams.get('token') || '';
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // トークンがない場合
  if (!token && !authLoading) {
    return (
      <Container size="sm" className="py-12">
        <Card className="text-center">
          <Heading as="h2" size="h2" className="mb-4">無効なリンク</Heading>
          <Text color="muted" className="mb-6">
            招待リンクが正しくありません。管理者にお問い合わせください。
          </Text>
          <Button onClick={() => navigate('/')}>ホームへ</Button>
        </Card>
      </Container>
    );
  }

  // ログイン後に自動で joinAsUchideshi を呼ぶ
  useEffect(() => {
    if (!isAuthenticated || !user || !token || joining || success || error) return;

    const doJoin = async () => {
      setJoining(true);
      try {
        await joinAsUchideshi(token);
        setSuccess(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '参加に失敗しました';
        if (message.includes('無効なトークン') || message.includes('permission-denied')) {
          setError('無効なトークンです。管理者にお問い合わせください。');
        } else {
          setError(message);
        }
      } finally {
        setJoining(false);
      }
    };

    doJoin();
  }, [isAuthenticated, user, token, joining, success, error]);

  if (authLoading) {
    return (
      <Container size="sm" className="py-12">
        <LoadingState message="読み込み中..." />
      </Container>
    );
  }

  // 成功画面
  if (success) {
    return (
      <Container size="sm" className="py-12">
        <Card className="text-center">
          <Heading as="h2" size="h2" className="mb-4">入門完了</Heading>
          <Text className="mb-6">
            内弟子として登録されました。すべての機能を無料でご利用いただけます。
          </Text>
          <Button onClick={() => navigate('/')}>はじめる</Button>
        </Card>
      </Container>
    );
  }

  // エラー画面
  if (error) {
    return (
      <Container size="sm" className="py-12">
        <Card className="text-center">
          <Heading as="h2" size="h2" className="mb-4">エラー</Heading>
          <Text color="muted" className="mb-6">{error}</Text>
          <div className="space-y-3">
            <Button onClick={() => navigate('/')}>ホームへ</Button>
          </div>
        </Card>
      </Container>
    );
  }

  // 未認証 — ログイン誘導
  if (!isAuthenticated) {
    return (
      <Container size="sm" className="py-12">
        <Card className="text-center">
          <Heading as="h2" size="h2" className="mb-4">内弟子入門</Heading>
          <Text color="muted" className="mb-6">
            内弟子として参加するにはログインが必要です
          </Text>
          <Button onClick={loginWithGoogle} className="w-full">
            Googleでログイン
          </Button>
        </Card>
      </Container>
    );
  }

  // 処理中
  return (
    <Container size="sm" className="py-12">
      <LoadingState message="内弟子登録中..." />
    </Container>
  );
}
