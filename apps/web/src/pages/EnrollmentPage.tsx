/**
 * 107: 入門確認画面
 * PAST_DUE / CANCELED ユーザー向け — Stripe Checkout への導線
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { startCheckout } from '@/services/billing.service';
import { PLAN_PRICE_YEN } from '@/types/billing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/PageStates';

export function EnrollmentPage() {
  const { isAuthenticated, loading } = useAuthContext();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <Container size="sm" className="py-12">
        <LoadingState message="読み込み中..." />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container size="sm" className="py-12">
        <Card className="text-center">
          <Heading as="h2" size="h2" className="mb-4">入門</Heading>
          <Text color="muted" className="mb-6">
            入門するにはログインが必要です
          </Text>
          <Button onClick={() => navigate('/profile')}>ログイン</Button>
        </Card>
      </Container>
    );
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      await startCheckout();
    } catch (err) {
      setError('決済画面の表示に失敗しました。もう一度お試しください。');
      setCheckoutLoading(false);
    }
  };

  return (
    <Container size="sm" className="py-12">
      <Card className="text-center">
        <Heading as="h2" size="h2" className="mb-4">入門のご案内</Heading>

        <div className="space-y-4 mb-8">
          <Text>
            稽古や歌合をお楽しみいただくには、入門が必要です。
          </Text>

          <div className="p-6 bg-gray-50 rounded-lg">
            <Text size="lg" weight="bold" className="mb-2">
              月額 {PLAN_PRICE_YEN.toLocaleString()}円
            </Text>
            <Text color="muted" size="sm">
              稽古（対戦練習）・歌合（大会）が利用可能になります
            </Text>
          </div>

          <div className="text-left space-y-2 px-4">
            <Text size="sm" color="muted">入門に含まれる機能:</Text>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>- 稽古（対戦練習）</li>
              <li>- 歌合（大会参加）</li>
              <li>- カード管理はStripeで簡単</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full"
          >
            {checkoutLoading ? '処理中...' : '入門する'}
          </Button>

          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            無料機能を使い続ける
          </button>
        </div>
      </Card>
    </Container>
  );
}
