/**
 * デザインパターン比較ページ（3パターン切替）
 * /design2 でアクセス可能、タブには非表示
 *
 * A: フラット — 枠なし、背景色で区切り、広い余白
 * B: エレベーション — 影で浮かせる、枠なし、奥行き表現
 * C: アクセントライン — 左線アクセント、枠は最小限
 */
import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { colors } from '@/lib/design-tokens';

type Pattern = 'flat' | 'elevation' | 'accent';

const PATTERNS: { value: Pattern; label: string; desc: string }[] = [
  { value: 'flat', label: 'A: フラット', desc: '枠なし・背景色区切り・広い余白' },
  { value: 'elevation', label: 'B: エレベーション', desc: '影で浮かせる・奥行き・枠なし' },
  { value: 'accent', label: 'C: アクセントライン', desc: '左線アクセント・枠は最小' },
];

// パターン別スタイル定義
function useStyles(pattern: Pattern) {
  return {
    // ページ背景
    pageBg: pattern === 'flat' ? 'bg-gray-50' : pattern === 'elevation' ? 'bg-gray-100' : 'bg-white',

    // カードスタイル
    card: pattern === 'flat'
      ? 'bg-white rounded-xl p-4'
      : pattern === 'elevation'
        ? 'bg-white rounded-xl p-4 shadow-md'
        : 'bg-white rounded-lg p-4 border-l-4',

    cardDefault: pattern === 'accent' ? `border-l-[${colors.gray300}]` : '',

    // PageHeader
    header: pattern === 'flat'
      ? 'bg-white rounded-xl p-5'
      : pattern === 'elevation'
        ? 'bg-white rounded-xl p-5 shadow-lg'
        : 'bg-white rounded-lg p-5 border-l-4',

    headerBorderColor: pattern === 'accent' ? colors.tansei : undefined,

    // フォーム入力
    input: pattern === 'flat'
      ? 'w-full px-3 py-2.5 rounded-xl text-sm bg-gray-100 border-0 focus:bg-white focus:ring-2 focus:ring-blue-200 transition-all outline-none'
      : pattern === 'elevation'
        ? 'w-full px-3 py-2.5 rounded-xl text-sm bg-white border-0 shadow-inner focus:shadow-md focus:ring-2 focus:ring-blue-200 transition-all outline-none'
        : 'w-full px-3 py-2.5 rounded-lg text-sm bg-white border-b-2 border-gray-200 focus:border-karuta-tansei transition-colors outline-none',

    // セグメント
    segBg: pattern === 'flat'
      ? 'bg-gray-200'
      : pattern === 'elevation'
        ? 'bg-white shadow-inner'
        : 'bg-gray-100',

    segActive: pattern === 'flat'
      ? 'bg-white shadow-sm font-bold'
      : pattern === 'elevation'
        ? 'bg-white shadow-md font-bold'
        : 'font-bold border-b-2',

    segActiveBorderColor: pattern === 'accent' ? colors.tansei : undefined,

    // Stat カード
    stat: pattern === 'flat'
      ? 'bg-white rounded-xl p-3'
      : pattern === 'elevation'
        ? 'bg-white rounded-xl p-3 shadow-md'
        : 'bg-white rounded-lg p-3 border-l-4',

    // カード間スペーシング
    cardGap: 'space-y-3',

    // セクション間スペーシング
    sectionGap: 'space-y-5',
  };
}

export function Design2Page() {
  const [pattern, setPattern] = useState<Pattern>('flat');
  const s = useStyles(pattern);

  return (
    <div className={`min-h-screen ${s.pageBg} transition-colors duration-300`}>
      <Container size="md" className="py-6 space-y-5">
        {/* パターン選択ヘッダー */}
        <div className={`${s.header} transition-all duration-300`}
          style={s.headerBorderColor ? { borderLeftColor: s.headerBorderColor } : {}}
        >
          <div className="flex items-center gap-2 mb-1">
            <Heading as="h2" size="h2">デザインパターン比較</Heading>
            <Badge variant="warning">内部用</Badge>
          </div>
          <Text size="sm" color="muted" className="mb-4">
            モダン・高視認性・レスポンシブ最適化の3パターン
          </Text>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map(p => (
              <button
                key={p.value}
                onClick={() => setPattern(p.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  pattern === p.value
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={pattern === p.value ? { backgroundColor: colors.tansei } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Text size="xs" color="muted" className="mt-2">
            {PATTERNS.find(p => p.value === pattern)?.desc}
          </Text>
        </div>

        {/* 便りページ モック */}
        <BulletinMock pattern={pattern} s={s} />

        {/* フォーム モック */}
        <FormMock pattern={pattern} s={s} />

        {/* 統計 モック */}
        <StatsMock pattern={pattern} s={s} />

        {/* コンポーネント一覧 */}
        <ComponentShowcase pattern={pattern} s={s} />
      </Container>
    </div>
  );
}

// ===== 便りページモック =====
function BulletinMock({ pattern, s }: { pattern: Pattern; s: ReturnType<typeof useStyles> }) {
  const [tab, setTab] = useState<'kawaraban' | 'bugroom'>('kawaraban');

  const posts = [
    { pinned: true, type: 'system_news' as const, title: 'アプリをリリースしました', body: '百人一首の練習・対戦ができるWebアプリです。まずは手引タブから始めてみてください。', author: '管理者', date: '2026/02/12' },
    { pinned: false, type: 'system_news' as const, title: '新機能: 歌合の節気ランキング', body: '二十四節気ごとにランキングが確定します。次の節気までにスコアを伸ばしましょう。', author: '管理者', date: '2026/02/10' },
    { pinned: false, type: 'group_recruit' as const, title: '初心者歓迎！週末かるた会', body: '毎週土曜日に練習会をしています。初心者の方も大歓迎です。', author: 'かるた同好会', date: '2026/02/08' },
    { pinned: false, type: 'external_news' as const, title: '全日本かるた協会 春の大会情報', body: undefined, author: '管理者', date: '2026/02/05' },
  ];

  const bugs = [
    { status: 'new' as const, area: '稽古', title: 'タイマーが0で止まらない', author: 'ユーザーA', date: '2026/02/11' },
    { status: 'confirmed' as const, area: '歌合', title: 'エントリーボタンが反応しない時がある', author: 'ユーザーB', date: '2026/02/09' },
    { status: 'fixed' as const, area: '手習', title: '決まり字ハイライトの色が薄い', author: 'ユーザーC', date: '2026/02/06' },
  ];

  const typeVariant: Record<string, BadgeVariant> = {
    system_news: 'info', external_news: 'accent', group_recruit: 'success',
  };
  const typeLabel: Record<string, string> = {
    system_news: 'お知らせ', external_news: '外部ニュース', group_recruit: '団体募集',
  };
  const statusVariant: Record<string, BadgeVariant> = {
    new: 'danger', confirmed: 'info', fixed: 'success',
  };
  const statusLabel: Record<string, string> = {
    new: '新規', confirmed: '確認済', fixed: '修正済',
  };

  const accentColorForType = (type: string) => {
    if (pattern !== 'accent') return {};
    const map: Record<string, string> = {
      system_news: colors.tansei, external_news: colors.accent,
      group_recruit: '#22c55e', pinned: colors.accent,
    };
    return { borderLeftColor: map[type] || colors.gray300 };
  };

  const accentColorForStatus = (status: string) => {
    if (pattern !== 'accent') return {};
    const map: Record<string, string> = {
      new: colors.red, confirmed: '#3b82f6', fixed: '#22c55e',
    };
    return { borderLeftColor: map[status] || colors.gray300 };
  };

  return (
    <div className={s.sectionGap}>
      <div className={`${s.header} transition-all duration-300`}
        style={s.headerBorderColor ? { borderLeftColor: s.headerBorderColor } : {}}
      >
        <Heading as="h3" size="h3">便り</Heading>
      </div>

      {/* Tabs */}
      <div className={`${s.segBg} rounded-xl p-1 inline-flex gap-1 transition-all duration-300`}>
        {(['kawaraban', 'bugroom'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all duration-200 ${
              tab === t ? `${s.segActive} text-karuta-tansei` : 'text-gray-500 hover:text-gray-700'
            }`}
            style={tab === t && s.segActiveBorderColor ? { borderBottomColor: s.segActiveBorderColor } : {}}
          >
            {t === 'kawaraban' ? '瓦版' : '不具合の部屋'}
          </button>
        ))}
      </div>

      {/* Posts */}
      {tab === 'kawaraban' ? (
        <div className={s.cardGap}>
          {posts.map((post, i) => (
            <div
              key={i}
              className={`${s.card} transition-all duration-300 hover:scale-[1.005]`}
              style={post.pinned ? accentColorForType('pinned') : accentColorForType(post.type)}
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {post.pinned && <Badge variant="accent">固定</Badge>}
                <Badge variant={typeVariant[post.type]}>{typeLabel[post.type]}</Badge>
              </div>
              <Text weight="bold" className="mb-1">{post.title}</Text>
              {post.body && <Text size="sm" color="muted" className="line-clamp-2 mb-2">{post.body}</Text>}
              <div className="flex items-center gap-3">
                <Text size="xs" color="muted">{post.author}</Text>
                <Text size="xs" color="muted">{post.date}</Text>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={s.cardGap}>
          {bugs.map((bug, i) => (
            <div
              key={i}
              className={`${s.card} transition-all duration-300 cursor-pointer hover:scale-[1.005]`}
              style={accentColorForStatus(bug.status)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={statusVariant[bug.status]}>{statusLabel[bug.status]}</Badge>
                    <Badge variant="outline">{bug.area}</Badge>
                  </div>
                  <Text weight="bold" className="mb-1">{bug.title}</Text>
                  <div className="flex items-center gap-3">
                    <Text size="xs" color="muted">{bug.author}</Text>
                    <Text size="xs" color="muted">{bug.date}</Text>
                  </div>
                </div>
                {bug.status === 'new' && (
                  <Button variant="outline" size="sm">確認</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== フォームモック =====
function FormMock({ pattern, s }: { pattern: Pattern; s: ReturnType<typeof useStyles> }) {
  return (
    <div className={s.sectionGap}>
      <Heading as="h3" size="h4">フォーム</Heading>
      <div
        className={`${s.card} ${s.sectionGap} transition-all duration-300`}
        style={pattern === 'accent' ? { borderLeftColor: colors.tansei } : {}}
      >
        <Text weight="bold" size="lg">瓦版に投稿</Text>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">種別</label>
            <select className={s.input}>
              <option>お知らせ</option>
              <option>外部ニュース</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span className="text-red-400">*</span></label>
            <input className={s.input} placeholder="タイトル（80文字以内）" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">本文</label>
            <textarea className={s.input} rows={3} placeholder="本文（任意）" />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-karuta-tansei"></div>
            </label>
            <Text size="sm">ピン留め</Text>
          </div>
          <div className="flex gap-2 pt-1">
            <Button>投稿する</Button>
            <Button variant="secondary">キャンセル</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 統計モック =====
function StatsMock({ pattern, s }: { pattern: Pattern; s: ReturnType<typeof useStyles> }) {
  const stats = [
    { label: '練習回数', value: '128', accent: false },
    { label: '正答率', value: '92%', accent: false },
    { label: '最高スコア', value: '980', accent: true },
    { label: '連続日数', value: '7日', accent: false },
  ];

  const accentColors = [colors.tansei, '#22c55e', colors.accent, '#3b82f6'];

  return (
    <div className={s.sectionGap}>
      <Heading as="h3" size="h4">統計</Heading>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`${s.stat} transition-all duration-300`}
            style={pattern === 'accent' ? { borderLeftColor: accentColors[i] } : {}}
          >
            <Text size="xs" color="muted" className="mb-1">{stat.label}</Text>
            <Text
              as="p"
              weight="bold"
              className={`text-xl leading-none ${stat.accent ? 'text-karuta-accent' : ''}`}
            >
              {stat.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== コンポーネントショーケース =====
function ComponentShowcase({ pattern, s }: { pattern: Pattern; s: ReturnType<typeof useStyles> }) {
  return (
    <div className={s.sectionGap}>
      <Heading as="h3" size="h4">コンポーネント</Heading>

      {/* Buttons */}
      <div
        className={`${s.card} transition-all duration-300`}
        style={pattern === 'accent' ? { borderLeftColor: colors.tansei } : {}}
      >
        <Text weight="bold" className="mb-3">Button</Text>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm">primary</Button>
          <Button variant="secondary" size="sm">secondary</Button>
          <Button variant="accent" size="sm">accent</Button>
          <Button variant="ghost" size="sm">ghost</Button>
          <Button variant="outline" size="sm">outline</Button>
          <Button variant="danger" size="sm">danger</Button>
        </div>
      </div>

      {/* Badges */}
      <div
        className={`${s.card} transition-all duration-300`}
        style={pattern === 'accent' ? { borderLeftColor: '#3b82f6' } : {}}
      >
        <Text weight="bold" className="mb-3">Badge</Text>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="accent">accent</Badge>
          <Badge variant="danger">danger</Badge>
          <Badge variant="success">success</Badge>
          <Badge variant="info">info</Badge>
          <Badge variant="warning">warning</Badge>
        </div>
      </div>

      {/* Typography */}
      <div
        className={`${s.card} transition-all duration-300`}
        style={pattern === 'accent' ? { borderLeftColor: colors.accent } : {}}
      >
        <Text weight="bold" className="mb-3">Typography</Text>
        <div className="space-y-2">
          <Heading as="h3" size="h3">h3: 百人一首を、遊ぼう。</Heading>
          <Heading as="h4" size="h4">h4: 百人一首を、遊ぼう。</Heading>
          <Text>base: 覚えるほど、取れる速さが増していく。</Text>
          <Text size="sm" color="muted">sm/muted: 補助テキスト</Text>
        </div>
      </div>

      {/* パターン説明 */}
      <div
        className={`${s.card} transition-all duration-300`}
        style={pattern === 'accent' ? { borderLeftColor: '#22c55e' } : {}}
      >
        <Text weight="bold" className="mb-3">パターン特性まとめ</Text>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">項目</th>
                {PATTERNS.map(p => (
                  <th key={p.value} className={`text-left py-2 px-2 font-medium ${pattern === p.value ? 'text-karuta-tansei' : 'text-gray-500'}`}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">カード区切り</td>
                <td className="py-2 px-2">背景色差</td>
                <td className="py-2 px-2">影（shadow）</td>
                <td className="py-2 px-2">左線アクセント</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">ページ背景</td>
                <td className="py-2 px-2">gray-50</td>
                <td className="py-2 px-2">gray-100</td>
                <td className="py-2 px-2">white</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">フォーム入力</td>
                <td className="py-2 px-2">bg塗り → focus白</td>
                <td className="py-2 px-2">内影 → focus影拡大</td>
                <td className="py-2 px-2">下線 → focus色変</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-medium">角丸</td>
                <td className="py-2 px-2">xl（大きめ）</td>
                <td className="py-2 px-2">xl（大きめ）</td>
                <td className="py-2 px-2">lg（標準）</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">印象</td>
                <td className="py-2 px-2">軽快・開放的</td>
                <td className="py-2 px-2">立体的・リッチ</td>
                <td className="py-2 px-2">構造的・整然</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
