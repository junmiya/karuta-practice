/**
 * デザインシステム ショーケース（T077 スペーシング・デザイン統一 イメージ）
 * /design でアクセス可能、タブには非表示
 * 枠あり / 枠なし をボタンで切替可能
 */
import { useState, createContext, useContext } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heading, Text } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState, EmptyState } from '@/components/ui/PageStates';
import { colors } from '@/lib/design-tokens';

type SectionTab = 'colors' | 'typography' | 'spacing' | 'components' | 'pages';

const SECTION_TABS: { value: SectionTab; label: string }[] = [
  { value: 'colors', label: 'カラー' },
  { value: 'typography', label: '文字' },
  { value: 'spacing', label: '余白' },
  { value: 'components', label: '部品' },
  { value: 'pages', label: 'ページ例' },
];

// 枠なしモードの共有コンテキスト
const BorderlessContext = createContext(false);
const useBorderless = () => useContext(BorderlessContext);

/** Card のラッパー: 枠なしモードでは border-transparent + shadow-none */
function DCard({ children, className = '', ...props }: React.ComponentProps<typeof Card>) {
  const borderless = useBorderless();
  const bl = borderless ? 'border-transparent shadow-none' : '';
  return <Card className={`${bl} ${className}`} {...props}>{children}</Card>;
}

/** PageHeader のラッパー */
function DPageHeader(props: React.ComponentProps<typeof PageHeader>) {
  const borderless = useBorderless();
  const bl = borderless ? 'border-transparent shadow-none' : '';
  return <PageHeader className={bl} {...props} />;
}

/** フォーム input の共通クラス */
function useInputClass() {
  const borderless = useBorderless();
  const base = 'w-full px-3 py-2 rounded-lg text-sm';
  return borderless
    ? `${base} border border-transparent bg-gray-50 focus:bg-white focus:border-gray-300 transition-colors`
    : `${base} border border-gray-300`;
}

function useFilterClass() {
  const borderless = useBorderless();
  const base = 'px-3 py-1 rounded-lg text-sm';
  return borderless
    ? `${base} border border-transparent bg-gray-50`
    : `${base} border border-gray-300`;
}

export function DesignPage() {
  const [activeSection, setActiveSection] = useState<SectionTab>('colors');
  const [borderless, setBorderless] = useState(false);

  return (
    <BorderlessContext.Provider value={borderless}>
      <Container size="md" className="py-6 space-y-6">
        <DPageHeader
          title="デザインシステム"
          subtitle="T077 スペーシング・デザイン統一ガイド"
          badge={{ text: borderless ? '枠なし' : '枠あり', variant: borderless ? 'accent' : 'info' }}
        >
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={borderless ? 'outline' : 'primary'}
              onClick={() => setBorderless(false)}
            >
              枠あり
            </Button>
            <Button
              size="sm"
              variant={borderless ? 'primary' : 'outline'}
              onClick={() => setBorderless(true)}
            >
              枠なし
            </Button>
          </div>
        </DPageHeader>

        <SegmentedControl
          options={SECTION_TABS}
          value={activeSection}
          onChange={setActiveSection}
          size="md"
        />

        {activeSection === 'colors' && <ColorsSection />}
        {activeSection === 'typography' && <TypographySection />}
        {activeSection === 'spacing' && <SpacingSection />}
        {activeSection === 'components' && <ComponentsSection />}
        {activeSection === 'pages' && <PagesSection />}
      </Container>
    </BorderlessContext.Provider>
  );
}

// ===== カラーパレット =====
function ColorsSection() {
  const colorGroups = [
    {
      title: 'プライマリ（淡青 tansei）',
      items: [
        { name: 'tansei', value: colors.tansei },
        { name: 'tanseiHover', value: colors.tanseiHover },
        { name: 'tanseiLight', value: colors.tanseiLight },
      ],
    },
    {
      title: 'アクセント（黄）',
      items: [
        { name: 'accent', value: colors.accent },
        { name: 'accentHover', value: colors.accentHover },
        { name: 'accentLight', value: colors.accentLight },
      ],
    },
    {
      title: '競技かるた（深紅）',
      items: [
        { name: 'red', value: colors.red },
        { name: 'redHover', value: colors.redHover },
        { name: 'redLight', value: colors.redLight },
      ],
    },
    {
      title: 'ニュートラル',
      items: [
        { name: 'black', value: colors.black },
        { name: 'gray900', value: colors.gray900 },
        { name: 'gray700', value: colors.gray700 },
        { name: 'gray600', value: colors.gray600 },
        { name: 'gray500', value: colors.gray500 },
        { name: 'gray400', value: colors.gray400 },
        { name: 'gray300', value: colors.gray300 },
        { name: 'gray200', value: colors.gray200 },
        { name: 'gray100', value: colors.gray100 },
        { name: 'gray50', value: colors.gray50 },
        { name: 'white', value: colors.white },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <Heading as="h3" size="h3">カラーパレット</Heading>
      <Text size="sm" color="muted">
        Tailwindクラス: bg-karuta-tansei, text-karuta-accent, bg-karuta-red
      </Text>
      {colorGroups.map(group => (
        <DCard padding="sm" key={group.title}>
          <Text weight="bold" className="mb-3">{group.title}</Text>
          <div className="flex flex-wrap gap-2">
            {group.items.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg border border-gray-200"
                  style={{ backgroundColor: item.value }}
                />
                <div>
                  <Text size="xs" weight="medium">{item.name}</Text>
                  <Text size="xs" color="muted">{item.value}</Text>
                </div>
              </div>
            ))}
          </div>
        </DCard>
      ))}
    </div>
  );
}

// ===== タイポグラフィ =====
function TypographySection() {
  return (
    <div className="space-y-4">
      <Heading as="h3" size="h3">タイポグラフィ</Heading>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">Heading コンポーネント</Text>
        <div className="space-y-2 border-l-2 border-gray-200 pl-4">
          <Heading as="h1" size="h1">h1: 百人一首を、遊ぼう。</Heading>
          <Heading as="h2" size="h2">h2: 百人一首を、遊ぼう。</Heading>
          <Heading as="h3" size="h3">h3: 百人一首を、遊ぼう。</Heading>
          <Heading as="h4" size="h4">h4: 百人一首を、遊ぼう。</Heading>
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">Text コンポーネント</Text>
        <div className="space-y-2 border-l-2 border-gray-200 pl-4">
          <Text size="xl">xl: 覚えるほど、取れる速さが増していく。</Text>
          <Text size="lg">lg: 覚えるほど、取れる速さが増していく。</Text>
          <Text size="base">base: 覚えるほど、取れる速さが増していく。</Text>
          <Text size="sm">sm: 覚えるほど、取れる速さが増していく。</Text>
          <Text size="xs">xs: 覚えるほど、取れる速さが増していく。</Text>
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">Text カラーバリエーション</Text>
        <div className="space-y-1 border-l-2 border-gray-200 pl-4">
          <Text color="default">default: 通常テキスト</Text>
          <Text color="muted">muted: 補助テキスト</Text>
          <Text color="primary">primary: 強調テキスト</Text>
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">フォームラベル統一規則</Text>
        <div className="space-y-3 border-l-2 border-gray-200 pl-4">
          <div>
            <Text size="sm" color="muted" className="mb-1">NG: 旧スタイル（text-xs text-gray-600）</Text>
            <label className="block text-xs text-gray-600 mb-1">ラベル名</label>
          </div>
          <div>
            <Text size="sm" color="muted" className="mb-1">OK: 統一スタイル（text-sm font-medium text-gray-700）</Text>
            <label className="block text-sm font-medium text-gray-700 mb-1">ラベル名</label>
          </div>
        </div>
      </DCard>
    </div>
  );
}

// ===== スペーシング =====
function SpacingSection() {
  const inputClass = useInputClass();
  const filterClass = useFilterClass();

  const spacingScale = [
    { name: '0.5', px: '2px', rem: '0.125rem' },
    { name: '1', px: '4px', rem: '0.25rem' },
    { name: '2', px: '8px', rem: '0.5rem' },
    { name: '3', px: '12px', rem: '0.75rem' },
    { name: '4', px: '16px', rem: '1rem' },
    { name: '5', px: '20px', rem: '1.25rem' },
    { name: '6', px: '24px', rem: '1.5rem' },
    { name: '8', px: '32px', rem: '2rem' },
  ];

  return (
    <div className="space-y-4">
      <Heading as="h3" size="h3">スペーシング</Heading>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">スペーシングスケール</Text>
        <div className="space-y-2">
          {spacingScale.map(s => (
            <div key={s.name} className="flex items-center gap-3">
              <Text size="xs" color="muted" className="w-8 text-right">{s.name}</Text>
              <div
                className="h-4 rounded"
                style={{ width: s.rem, backgroundColor: colors.tansei }}
              />
              <Text size="xs" color="muted">{s.px} ({s.rem})</Text>
            </div>
          ))}
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">Container サイズ比較</Text>
        <Text size="sm" color="muted">全ページで Container コンポーネントを使用</Text>
        <div className="space-y-3">
          {[
            { size: 'sm', width: '640px', usage: 'プロフィール、結果' },
            { size: 'md', width: '768px', usage: '手引、便り、不具合詳細' },
            { size: 'lg', width: '1024px', usage: '管理者' },
          ].map(c => (
            <div key={c.size} className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={c.size === 'md' ? 'default' : 'outline'}>{c.size}</Badge>
                <Text size="sm">{c.width}</Text>
                <Text size="xs" color="muted">{c.usage}</Text>
              </div>
              <div
                className="h-3 rounded"
                style={{
                  width: `${(parseInt(c.width) / 1024) * 100}%`,
                  backgroundColor: c.size === 'md' ? colors.tansei : colors.gray300,
                }}
              />
            </div>
          ))}
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">ページ構成の統一ルール</Text>
        <div className="space-y-2 border-l-2 border-gray-200 pl-4">
          <Text size="sm">1. Container size="md" className="py-6 space-y-4"</Text>
          <Text size="sm">2. PageHeader（タイトル + オプションバッジ/ボタン）</Text>
          <Text size="sm">3. SegmentedControl（タブ切替がある場合）</Text>
          <Text size="sm">4. Card padding="sm"（コンテンツカード）</Text>
          <Text size="sm">5. カード間: space-y-3</Text>
        </div>
      </DCard>

      <DCard padding="sm" className="space-y-4">
        <Text weight="bold">フォーム入力の統一ルール</Text>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">select / input</label>
            <input className={inputClass} placeholder="入力フィールド" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フィルタ用 select（コンパクト）</label>
            <select className={filterClass}>
              <option>フィルタ選択</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">textarea</label>
            <textarea className={inputClass} rows={2} placeholder="自由記述" readOnly />
          </div>
        </div>
      </DCard>
    </div>
  );
}

// ===== コンポーネント一覧 =====
function ComponentsSection() {
  const borderless = useBorderless();
  const [segValue, setSegValue] = useState<'a' | 'b' | 'c'>('a');

  return (
    <div className="space-y-4">
      <Heading as="h3" size="h3">UIコンポーネント</Heading>

      {/* Button */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">Button</Text>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm">primary</Button>
          <Button variant="secondary" size="sm">secondary</Button>
          <Button variant="accent" size="sm">accent</Button>
          <Button variant="ghost" size="sm">ghost</Button>
          <Button variant="outline" size="sm">outline</Button>
          <Button variant="danger" size="sm">danger</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">sm</Button>
          <Button size="md">md</Button>
          <Button size="lg">lg</Button>
        </div>
      </DCard>

      {/* Badge */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">Badge</Text>
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
      </DCard>

      {/* Card */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">Card padding バリエーション</Text>
        <div className="grid grid-cols-3 gap-2">
          <DCard padding="sm" className="bg-gray-50">
            <Text size="xs">padding="sm" (p-4)</Text>
          </DCard>
          <DCard padding="md" className="bg-gray-50">
            <Text size="xs">padding="md" (p-6)</Text>
          </DCard>
          <DCard padding="lg" className="bg-gray-50">
            <Text size="xs">padding="lg" (p-8)</Text>
          </DCard>
        </div>
      </DCard>

      {/* PageHeader */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">PageHeader</Text>
        <DPageHeader title="ページタイトル" subtitle="サブタイトルテキスト" badge={{ text: 'バッジ', variant: 'info' }} />
      </DCard>

      {/* SegmentedControl */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">SegmentedControl</Text>
        <SegmentedControl
          options={[
            { value: 'a' as const, label: 'タブA' },
            { value: 'b' as const, label: 'タブB' },
            { value: 'c' as const, label: 'タブC' },
          ]}
          value={segValue}
          onChange={setSegValue}
          size="md"
        />
      </DCard>

      {/* StatCard */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">StatCard</Text>
        <Text size="xs" color="muted">
          {borderless ? '枠なし: shadow-none + border-transparent' : '枠あり: shadow-sm + border'}
        </Text>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="練習回数" value={128} small />
          <StatCard label="正答率" value="92%" small />
          <StatCard label="最高スコア" value={980} highlight small />
        </div>
      </DCard>

      {/* States */}
      <DCard padding="sm" className="space-y-3">
        <Text weight="bold">状態コンポーネント</Text>
        <LoadingState message="読み込み中..." />
        <EmptyState message="データがありません" />
      </DCard>
    </div>
  );
}

// ===== ページ構成例 =====
function PagesSection() {
  const borderless = useBorderless();
  const inputClass = useInputClass();

  const cardBorder = borderless ? '' : 'border border-gray-300';
  const cardShadow = borderless ? 'shadow-none' : 'shadow-sm';

  return (
    <div className="space-y-4">
      <Heading as="h3" size="h3">T077 統一後のページ構成イメージ</Heading>

      <DCard padding="sm" className="space-y-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">標準ページテンプレート</Text>
          <Badge variant={borderless ? 'accent' : 'info'}>{borderless ? '枠なし' : '枠あり'}</Badge>
        </div>
        <div className="rounded-lg p-4 space-y-3 bg-gray-50">
          {/* PageHeader mock */}
          <div className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
            <div className="flex items-center gap-2">
              <Text weight="bold">PageHeader</Text>
              <Badge variant="info">バッジ</Badge>
            </div>
            <Text size="sm" color="muted">subtitle</Text>
          </div>
          {/* SegmentedControl mock */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1">
            <div className="bg-white rounded px-3 py-1 text-xs font-medium" style={{ color: colors.tansei }}>タブ1</div>
            <div className="px-3 py-1 text-xs text-gray-500">タブ2</div>
          </div>
          {/* Card list mock */}
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="accent" className="text-[10px]">Badge</Badge>
                  <Text size="xs" color="muted">メタ情報</Text>
                </div>
                <Text size="sm">カードコンテンツ {i}</Text>
              </div>
            ))}
          </div>
        </div>
        <Text size="xs" color="muted">Container(md) {'>'} PageHeader {'>'} SegmentedControl {'>'} Card(sm) x N</Text>
      </DCard>

      <DCard padding="sm" className="space-y-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">フォームページテンプレート</Text>
          <Badge variant={borderless ? 'accent' : 'info'}>{borderless ? '枠なし' : '枠あり'}</Badge>
        </div>
        <div className="rounded-lg p-4 space-y-3 bg-gray-50">
          <div className={`rounded-lg p-3 bg-white space-y-3 ${cardBorder} ${cardShadow}`}>
            <Text weight="bold">フォームタイトル</Text>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ラベル *</label>
              <input className={inputClass} placeholder="入力フィールド" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選択</label>
              <select className={inputClass}>
                <option>オプション1</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">テキスト</label>
              <textarea className={inputClass} rows={2} placeholder="自由記述" readOnly />
            </div>
            <div className="flex gap-2">
              <Button size="sm">送信</Button>
              <Button variant="secondary" size="sm">キャンセル</Button>
            </div>
          </div>
        </div>
        <Text size="xs" color="muted">
          {borderless
            ? 'Card: border-transparent shadow-none / Input: bg-gray-50 border-transparent → focus時にborder表示'
            : 'Card: border shadow-sm / Input: border border-gray-300'
          }
        </Text>
      </DCard>

      {/* 便りページ mock */}
      <DCard padding="sm" className="space-y-3">
        <div className="flex items-center gap-2">
          <Text weight="bold">便りページ イメージ</Text>
          <Badge variant={borderless ? 'accent' : 'info'}>{borderless ? '枠なし' : '枠あり'}</Badge>
        </div>
        <div className="rounded-lg p-4 space-y-3 bg-gray-50">
          {/* PageHeader */}
          <div className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
            <Heading as="h3" size="h4">便り</Heading>
          </div>
          {/* SegmentedControl */}
          <div className="bg-gray-100 rounded-lg p-1 inline-flex gap-1">
            <div className="bg-white rounded px-3 py-1 text-xs font-medium" style={{ color: colors.tansei }}>瓦版</div>
            <div className="px-3 py-1 text-xs text-gray-500">不具合の部屋</div>
          </div>
          {/* Posts */}
          <div className="space-y-2">
            <div className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="accent">固定</Badge>
                <Badge variant="info">お知らせ</Badge>
              </div>
              <Text size="sm" weight="bold">アプリをリリースしました</Text>
              <div className="flex items-center gap-2 mt-1">
                <Text size="xs" color="muted">管理者</Text>
                <Text size="xs" color="muted">2026/02/12</Text>
              </div>
            </div>
            <div className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="accent">お知らせ</Badge>
              </div>
              <Text size="sm" weight="bold">新機能: 歌合の節気ランキング</Text>
              <Text size="xs" color="muted" className="mt-1 line-clamp-2">二十四節気ごとにランキングが確定します。次の節気までに...</Text>
              <div className="flex items-center gap-2 mt-1">
                <Text size="xs" color="muted">管理者</Text>
                <Text size="xs" color="muted">2026/02/10</Text>
              </div>
            </div>
            <div className={`rounded-lg p-3 bg-white ${cardBorder} ${cardShadow}`}>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success">団体募集</Badge>
              </div>
              <Text size="sm" weight="bold">初心者歓迎！週末かるた会</Text>
              <div className="flex items-center gap-2 mt-1">
                <Text size="xs" color="muted">かるた同好会</Text>
                <Text size="xs" color="muted">2026/02/08</Text>
              </div>
            </div>
          </div>
        </div>
      </DCard>
    </div>
  );
}
