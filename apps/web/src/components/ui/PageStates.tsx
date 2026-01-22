import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';
import { Text } from './Typography';

interface LoadingStateProps {
  message?: string;
}

/**
 * 統一ローディング表示
 */
export function LoadingState({ message = 'データを読み込み中...' }: LoadingStateProps) {
  return (
    <Card>
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red mx-auto mb-4" />
          <Text color="muted">{message}</Text>
        </div>
      </div>
    </Card>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * 統一エラー表示
 */
export function ErrorState({
  message = 'データの取得に失敗しました',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="bg-red-50 border-red-200">
      <div className="py-8 text-center">
        <Text className="text-red-800 mb-4">{message}</Text>
        {onRetry && (
          <Button onClick={onRetry} variant="secondary">
            再試行
          </Button>
        )}
      </div>
    </Card>
  );
}

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
}

/**
 * 統一空状態表示
 */
export function EmptyState({
  message,
  actionLabel,
  actionPath,
  onAction,
}: EmptyStateProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionPath) {
      navigate(actionPath);
    }
  };

  return (
    <Card>
      <div className="py-8 text-center">
        <Text color="muted" className="mb-4">
          {message}
        </Text>
        {(actionLabel && (actionPath || onAction)) && (
          <Button onClick={handleAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface AuthRequiredStateProps {
  message?: string;
}

/**
 * 統一認証必要表示
 */
export function AuthRequiredState({
  message = '成績を記録・閲覧するにはログインとプロフィール設定が必要です',
}: AuthRequiredStateProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <div className="py-8 text-center">
        <Text color="muted" className="mb-6">
          {message}
        </Text>
        <Button onClick={() => navigate('/profile')}>
          ログイン / プロフィール設定
        </Button>
      </div>
    </Card>
  );
}

interface InfoBoxProps {
  title: string;
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success';
}

/**
 * 統一情報ボックス
 */
export function InfoBox({ title, children, variant = 'info' }: InfoBoxProps) {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    success: 'bg-green-50 border-green-200 text-green-900',
  };

  const textStyles = {
    info: 'text-blue-800',
    warning: 'text-yellow-800',
    success: 'text-green-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantStyles[variant]}`}>
      <h4 className="font-bold mb-2">{title}</h4>
      <div className={`text-sm ${textStyles[variant]}`}>
        {children}
      </div>
    </div>
  );
}
