/**
 * 107: 課金対象機能ガード
 * PAST_DUE / CANCELED → EnrollmentPage にリダイレクト
 * FREE / TRIAL / ACTIVE → children を表示
 */
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { getBillingStatus } from '@/services/billing.service';
import type { BillingStatus } from '@/types/billing';
import { Container } from '@/components/ui/Container';
import { LoadingState } from '@/components/ui/PageStates';

interface BillingGuardProps {
  children: React.ReactNode;
}

export function BillingGuard({ children }: BillingGuardProps) {
  const { isAuthenticated, user, loading: authLoading } = useAuthContext();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setBillingLoading(false);
      return;
    }

    getBillingStatus(user.uid)
      .then(({ status }) => setBillingStatus(status))
      .catch(() => setBillingStatus(null))
      .finally(() => setBillingLoading(false));
  }, [user?.uid]);

  if (authLoading || billingLoading) {
    return (
      <Container size="sm" className="py-12">
        <LoadingState message="読み込み中..." />
      </Container>
    );
  }

  // 未認証はログインページへ
  if (!isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  // PAST_DUE / CANCELED は入門画面へ
  if (billingStatus === 'PAST_DUE' || billingStatus === 'CANCELED') {
    return <Navigate to="/enrollment" replace />;
  }

  // billing レコードがない場合（初回ユーザー）は通す（ensureBillingOnJoin で初期化される）
  return <>{children}</>;
}
