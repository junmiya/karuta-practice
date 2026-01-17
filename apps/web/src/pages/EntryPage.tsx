/**
 * Entry page for official competition
 * Users select division and consent to ranking display
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  getActiveSeason,
  getUserEntry,
  createEntry,
  canEnterDanDivision,
} from '@/services/entry.service';
import type { Season, Entry, Division } from '@/types/entry';

export function EntryPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [season, setSeason] = useState<Season | null>(null);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [canDan, setCanDan] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division>('kyu');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load season and entry data
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        const [activeSeason, , danEligible] = await Promise.all([
          getActiveSeason(),
          user ? getActiveSeason().then((s) =>
            s ? getUserEntry(user.uid, s.seasonId) : null
          ) : null,
          user ? canEnterDanDivision(user.uid) : false,
        ]);

        setSeason(activeSeason);
        if (activeSeason && user) {
          const userEntry = await getUserEntry(user.uid, activeSeason.seasonId);
          setExistingEntry(userEntry);
        }
        setCanDan(danEligible);
      } catch (err) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  // Handle entry submission
  const handleSubmit = async () => {
    if (!user || !season || !consent) return;

    setSubmitting(true);
    setError(null);

    try {
      await createEntry(user.uid, season.seasonId, selectedDivision);
      // Redirect to official competition page
      navigate('/official');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エントリーに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // Auth check
  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">ログインが必要です</h1>
          <p className="text-gray-600 mb-6">
            公式競技にエントリーするにはログインしてください。
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary"
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">シーズン情報なし</h1>
          <p className="text-gray-600">
            現在アクティブなシーズンがありません。
          </p>
        </div>
      </div>
    );
  }

  if (existingEntry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">エントリー済み</h1>
          <p className="text-gray-600 mb-4">
            {season.name}に{existingEntry.division === 'kyu' ? '級位の部' : '段位の部'}でエントリー済みです。
          </p>
          <button
            onClick={() => navigate('/official')}
            className="btn-primary"
          >
            公式競技を開始する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold mb-6 text-center">{season.name} エントリー</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {/* Division selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">部門を選択</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedDivision('kyu')}
              className={`flex-1 p-4 border rounded transition-all ${selectedDivision === 'kyu'
                  ? 'border-karuta-red bg-red-50 ring-2 ring-karuta-red'
                  : 'border-gray-200 hover:border-karuta-red'
                }`}
            >
              <div className="font-bold text-lg">級位の部</div>
              <div className="text-sm text-gray-500">初心者〜中級者向け</div>
            </button>

            <button
              onClick={() => canDan && setSelectedDivision('dan')}
              disabled={!canDan}
              className={`flex-1 p-4 border rounded transition-all ${selectedDivision === 'dan'
                  ? 'border-karuta-gold bg-yellow-50 ring-2 ring-karuta-gold'
                  : canDan
                    ? 'border-gray-200 hover:border-karuta-gold'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
            >
              <div className="font-bold text-lg">段位の部</div>
              <div className="text-sm text-gray-500">
                {canDan ? '六級以上向け' : '六級取得後に参加可能'}
              </div>
            </button>
          </div>
        </div>

        {/* Consent checkbox */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-karuta-red focus:ring-karuta-red"
            />
            <div>
              <div className="font-medium">番付掲載に同意する</div>
              <div className="text-sm text-gray-600 mt-1">
                公式競技の結果は番付（ランキング）に表示名（ニックネーム）で掲載されます。
                同意しない場合はエントリーできません。
              </div>
            </div>
          </label>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!consent || submitting}
          className="w-full btn-primary text-lg py-4"
        >
          {submitting ? 'エントリー中...' : 'エントリーする'}
        </button>

        <p className="mt-4 text-sm text-gray-500 text-center">
          エントリー後は部門の変更はできません
        </p>
      </div>
    </div>
  );
}
