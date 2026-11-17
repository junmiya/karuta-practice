import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Typography';
import {
  isPasskeySupported,
  listPasskeys,
  registerPasskey,
  deletePasskey,
  passkeyErrorMessage,
  PasskeyCancelledError,
  type PasskeyItem,
} from '@/services/passkey.service';

const formatDate = (ms: number | null) =>
  ms ? new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : null;

/**
 * プロフィール画面: パスキーの登録・一覧・削除
 * 登録したパスキーは、ログイン画面の「パスキーでログイン」で使える
 */
export function PasskeySection() {
  const supported = isPasskeySupported();
  const [items, setItems] = useState<PasskeyItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const currentHost = window.location.hostname;

  const reload = useCallback(async () => {
    try {
      setItems(await listPasskeys());
    } catch (err) {
      setItems([]);
      setMessage({ type: 'error', text: passkeyErrorMessage(err, 'パスキーの一覧を読み込めませんでした') });
    }
  }, []);

  useEffect(() => {
    if (supported) void reload();
  }, [supported, reload]);

  const handleRegister = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await registerPasskey();
      setMessage({ type: 'ok', text: 'パスキーを登録しました。次回から「パスキーでログイン」が使えます。' });
      await reload();
    } catch (err) {
      if (!(err instanceof PasskeyCancelledError)) {
        setMessage({ type: 'error', text: passkeyErrorMessage(err, 'パスキーを登録できませんでした') });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: PasskeyItem) => {
    if (!confirm(`パスキー「${item.label}」を削除しますか？\nこのパスキーではログインできなくなります。`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await deletePasskey(item.id);
      setMessage({
        type: 'ok',
        text: '削除しました。端末やパスワード管理アプリに残ったパスキーは、そちらの設定からも削除できます。',
      });
      await reload();
    } catch (err) {
      setMessage({ type: 'error', text: passkeyErrorMessage(err, 'パスキーを削除できませんでした') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Heading as="h3" size="h3" className="mb-2 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-karuta-tansei" />
        パスキー
      </Heading>
      <p className="text-sm text-gray-600 mb-4">
        指紋・顔認証・端末のロック解除だけでログインできます。パスワードを入力する必要はありません。
      </p>

      {!supported ? (
        <p className="text-sm text-gray-500">このブラウザはパスキーに対応していません。</p>
      ) : (
        <div className="space-y-3">
          {message && (
            <div
              role={message.type === 'error' ? 'alert' : 'status'}
              className={
                message.type === 'error'
                  ? 'p-3 bg-red-50 text-red-700 rounded text-sm'
                  : 'p-3 bg-green-50 text-green-700 rounded text-sm'
              }
            >
              {message.text}
            </div>
          )}

          {items === null ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">まだ登録していません。</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg" aria-label="登録済みのパスキー">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{item.label}</div>
                    <div className="text-xs text-gray-400">
                      {formatDate(item.createdAt) && `${formatDate(item.createdAt)} 登録`}
                      {formatDate(item.lastUsedAt) && ` ・ ${formatDate(item.lastUsedAt)} 最終使用`}
                      {item.rpID !== currentHost && ` ・ ${item.rpID} 用`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={busy}
                    aria-label={`${item.label} を削除`}
                    className="shrink-0 p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={handleRegister} disabled={busy} variant="outline" className="w-full">
            {busy ? '処理中...' : '＋ この端末のパスキーを登録'}
          </Button>
        </div>
      )}
    </Card>
  );
}
