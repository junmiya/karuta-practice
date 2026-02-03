/**
 * 103: 団体機能 - 招待コード表示コンポーネント
 */
import { useState } from 'react';

interface InviteCodeDisplayProps {
  inviteCode: string;
  inviteUrl: string;
  expiresAt?: Date;
  onRegenerate?: () => void;
  onRevoke?: () => void;
  onShowQR?: () => void;
  isOwner?: boolean;
  loading?: boolean;
}

export function InviteCodeDisplay({
  inviteCode,
  inviteUrl,
  expiresAt,
  onRegenerate,
  onRevoke,
  onShowQR,
  isOwner = false,
  loading = false,
}: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          招待コード
        </h4>
        {expiresAt && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            有効期限: {formatDate(expiresAt)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm font-mono">
          {inviteCode}
        </code>
        <button
          onClick={() => copyToClipboard(inviteCode)}
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
          disabled={loading}
        >
          {copied ? 'コピー済み' : 'コピー'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => copyToClipboard(inviteUrl)}
          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
          disabled={loading}
        >
          URLをコピー
        </button>

        {onShowQR && (
          <button
            onClick={onShowQR}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
            disabled={loading}
          >
            QRコード
          </button>
        )}

        {isOwner && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors text-sm"
            disabled={loading}
          >
            再生成
          </button>
        )}

        {isOwner && onRevoke && (
          <button
            onClick={onRevoke}
            className="px-3 py-1.5 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors text-sm"
            disabled={loading}
          >
            無効化
          </button>
        )}
      </div>
    </div>
  );
}
