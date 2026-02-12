/**
 * 105: 手引ページ — 百人一首の導入・遊び方・友招待
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Container } from '@/components/ui/Container';
import * as inviteService from '@/services/invite.service';
import type { TargetMode, CreateInviteOutput } from '@/types/invite';
import { TARGET_MODE_LABELS } from '@/types/invite';
import { QRCodeSVG } from 'qrcode.react';

export function TebikiPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const scrollToInvite = () => {
    const el = document.getElementById('invite');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Container size="md" className="py-6 space-y-8">

      {/* === セクション1: 序文 === */}
      <section className="text-center space-y-4">
        <div className="space-y-2">
          <Text size="lg" className="leading-loose">
            ひと声で札が決まる瞬間が、気持ちよい。
          </Text>
          <Text size="lg" className="leading-loose">
            覚えるほど、取れる速さが増していく。
          </Text>
          <Text size="lg" className="leading-loose">
            友と競えば、一首が場を熱くする。
          </Text>
          <Text size="lg" className="leading-loose">
            この場は、手習・稽古・歌合で、その楽しさを育てます。
          </Text>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            一首ためす
          </Button>
          <Button variant="secondary" size="lg" onClick={scrollToInvite}>
            友を誘う
          </Button>
        </div>
      </section>

      {/* === セクション2: 百首のこと === */}
      <section>
        <Card padding="lg">
          <Heading as="h2" size="h3" className="mb-4">百首のこと</Heading>
          <div className="space-y-3">
            <div>
              <Text weight="medium">読札（よみふだ）</Text>
              <Text color="muted" size="sm">上の句が提示される札。読み上げられる側。</Text>
            </div>
            <div>
              <Text weight="medium">取札（とりふだ）</Text>
              <Text color="muted" size="sm">下の句を取る札。素早く見つけて取る側。</Text>
            </div>
            <div>
              <Text weight="medium">決まり字（きまりじ）</Text>
              <Text color="muted" size="sm">途中まで聞けば一意に定まる文字数。学習の鍵。</Text>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100">
            <Text weight="medium" className="mb-2">面白み</Text>
            <ul className="space-y-1">
              <li><Text size="sm" color="muted">・決まり字が決まる一瞬の快さ</Text></li>
              <li><Text size="sm" color="muted">・覚えるほど速くなる上達の実感</Text></li>
              <li><Text size="sm" color="muted">・友と競って熱くなる歌合</Text></li>
            </ul>
          </div>
        </Card>
      </section>

      {/* === セクション3: 遊びの手順 === */}
      <section>
        <Heading as="h2" size="h3" className="mb-4 text-center">遊びの手順</Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" centered hover>
            <Heading as="h3" size="h4" className="mb-2">はじめて</Heading>
            <Text size="sm" color="muted" className="mb-3">所要5分</Text>
            <Button variant="primary" size="sm" onClick={() => navigate('/')}>
              一首ためす
            </Button>
          </Card>
          <Card padding="md" centered hover>
            <Heading as="h3" size="h4" className="mb-2">覚える</Heading>
            <Text size="sm" color="muted" className="mb-3">所要15分</Text>
            <Button variant="primary" size="sm" onClick={() => navigate('/keiko')}>
              稽古で磨く
            </Button>
          </Card>
          <Card padding="md" centered hover>
            <Heading as="h3" size="h4" className="mb-2">友と</Heading>
            <Text size="sm" color="muted" className="mb-3">所要10分</Text>
            <Button variant="primary" size="sm" onClick={scrollToInvite}>
              友を誘う
            </Button>
          </Card>
          <Card padding="md" centered hover>
            <Heading as="h3" size="h4" className="mb-2">結び</Heading>
            <Text size="sm" color="muted" className="mb-3">仲間と集う</Text>
            <Button variant="primary" size="sm" onClick={() => navigate('/groups')}>
              結びを見る
            </Button>
          </Card>
        </div>
      </section>

      {/* === セクション4: 友を誘う（招待作成 + コード参加） === */}
      <section id="invite">
        <Card padding="lg">
          <Heading as="h2" size="h3" className="mb-4">友を誘う</Heading>
          {user ? (
            <InviteCreateSection />
          ) : (
            <div className="text-center space-y-3">
              <Text color="muted">
                ログインして友を招待できます。同じ条件で百人一首を始められます。
              </Text>
              <Button variant="secondary" onClick={() => navigate('/profile')}>
                ログインする
              </Button>
            </div>
          )}

          {/* コード参加セクション */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <InviteCodeJoinSection />
          </div>
        </Card>
      </section>

      {/* === セクション5: よくある問い === */}
      <section>
        <Heading as="h2" size="h3" className="mb-4 text-center">よくある問い</Heading>
        <div className="space-y-4">
          <Card padding="md">
            <Text weight="medium" className="mb-1">決まり字とは？</Text>
            <Text size="sm" color="muted">
              百人一首の上の句を途中まで聞けば、その歌が一つに決まる文字のことです。
              例えば「む」で始まる歌は1首だけなので、「む」が決まり字（1字決まり）です。
              決まり字を覚えると、より速く札を取れるようになります。
            </Text>
          </Card>
          <Card padding="md">
            <Text weight="medium" className="mb-1">招待リンクが開けない・期限切れの場合は？</Text>
            <Text size="sm" color="muted">
              招待リンクの有効期限は24時間です。期限切れの場合は、招待者に新しいリンクを作成してもらってください。
              リンクが開けない場合は、URLが正しくコピーされているか確認してください。
            </Text>
          </Card>
          <Card padding="md">
            <Text weight="medium" className="mb-1">ログインが必要な場面は？</Text>
            <Text size="sm" color="muted">
              手習（はじめて体験）はログイン不要です。稽古・歌合・招待の作成にはログインが必要です。
              招待リンクから手習モードに参加する場合もログインは不要です。
            </Text>
          </Card>
        </div>
      </section>

    </Container>
  );
}

// === 招待作成サブコンポーネント ===

function InviteCreateSection() {
  const [selectedMode, setSelectedMode] = useState<TargetMode>('tenarai');
  const [inviteResult, setInviteResult] = useState<CreateInviteOutput | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await inviteService.createInvite(selectedMode);
      setInviteResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '招待の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // フォールバック: テキスト選択
    }
  };

  const modes: TargetMode[] = ['tenarai', 'keiko', 'utaawase'];

  return (
    <div className="space-y-4">
      {!inviteResult ? (
        <>
          <Text size="sm" color="muted">対象モードを選んで招待を作成します</Text>
          <div className="flex gap-2">
            {modes.map((mode) => (
              <Button
                key={mode}
                variant={selectedMode === mode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedMode(mode)}
              >
                {TARGET_MODE_LABELS[mode]}
              </Button>
            ))}
          </div>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? '作成中...' : '招待を作る'}
          </Button>
          {error && <Text size="sm" color="muted" className="text-red-500">{error}</Text>}
        </>
      ) : (
        <div className="space-y-3">
          <Text size="sm" weight="medium">
            {TARGET_MODE_LABELS[selectedMode]}モードへの招待を作成しました
          </Text>

          {/* 招待リンク */}
          <div className="space-y-1">
            <Text size="xs" color="muted">招待リンク</Text>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteResult.inviteUrl}
                className="flex-1 text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-neutral-700"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(inviteResult.inviteUrl, 'link')}
              >
                {copied === 'link' ? 'コピーしました' : 'コピー'}
              </Button>
            </div>
          </div>

          {/* 招待コード */}
          <div className="space-y-1">
            <Text size="xs" color="muted">招待コード</Text>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold tracking-widest text-karuta-tansei">
                {inviteResult.inviteCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(inviteResult.inviteCode, 'code')}
              >
                {copied === 'code' ? 'コピーしました' : 'コピー'}
              </Button>
            </div>
          </div>

          {/* QRコード */}
          <div className="flex justify-center py-2">
            <QRCodeSVG value={inviteResult.inviteUrl} size={160} level="M" includeMargin />
          </div>

          <Text size="xs" color="muted">
            有効期限: {new Date(inviteResult.expiresAt).toLocaleString('ja-JP')}
          </Text>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setInviteResult(null); setError(null); }}
          >
            新しい招待を作る
          </Button>
        </div>
      )}
    </div>
  );
}

// === コード参加サブコンポーネント ===

function InviteCodeJoinSection() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinByCode = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      // まず招待情報を取得して有効性確認
      const info = await inviteService.getInviteInfo(undefined, code.toUpperCase());

      if (!info.found || info.status === 'not_found') {
        setError('コードが正しくありません');
        return;
      }
      if (info.status === 'expired') {
        setError('期限切れです');
        return;
      }

      // 参加処理
      const result = await inviteService.joinInvite(undefined, code.toUpperCase());
      navigate(result.redirectUrl);
    } catch {
      setError('コードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Text size="sm" weight="medium">招待コードで参加</Text>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().slice(0, 6));
            setError(null);
          }}
          placeholder="6文字のコード"
          maxLength={6}
          className="w-36 text-center text-lg font-mono font-bold tracking-widest border border-neutral-200 rounded px-2 py-1.5 uppercase"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleJoinByCode}
          disabled={code.length !== 6 || loading}
        >
          {loading ? '確認中...' : 'コードで参加'}
        </Button>
      </div>
      {error && <Text size="sm" className="text-red-500">{error}</Text>}
    </div>
  );
}
