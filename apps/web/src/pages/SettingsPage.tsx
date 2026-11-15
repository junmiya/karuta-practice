import { useMemo, type ReactNode } from 'react';
import { getAllPoemsSync } from '@/services/poems.service';
import { KarutaCard } from '@/components/KarutaCard';
import { cn } from '@/lib/utils';
import {
  useDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  type CardDisplaySettings,
  type TenaraiCount,
} from '@/lib/displaySettings';

// =============================================================================
// 部品
// =============================================================================

interface SegmentOption<T> {
  value: T;
  label: string;
}

function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex shrink-0 ml-auto bg-gray-100 rounded-lg p-0.5">
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-w-[3.5rem] px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              selected ? 'bg-white text-karuta-tansei shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    // 幅が足りないときは切替ボタンを次の行（右寄せ）に回す
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0 mr-auto">
        <div className="text-sm font-medium text-gray-800 whitespace-nowrap">{label}</div>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-base font-bold text-karuta-tansei">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="px-4">{children}</div>
    </section>
  );
}

const KANA_OPTIONS: SegmentOption<boolean>[] = [
  { value: true, label: 'かな' },
  { value: false, label: '漢字' },
];

const ONOFF_OPTIONS: SegmentOption<boolean>[] = [
  { value: true, label: '表示' },
  { value: false, label: '隠す' },
];

const COUNT_OPTIONS: SegmentOption<TenaraiCount>[] = [
  { value: 1, label: '1枚' },
  { value: 12, label: '12枚' },
  { value: 100, label: '全' },
];

/** 読札・取札・決まり字の3行（手習・稽古共通） */
function CardRows({
  value,
  onChange,
  prefix,
}: {
  value: CardDisplaySettings;
  onChange: (patch: Partial<CardDisplaySettings>) => void;
  prefix: string;
}) {
  return (
    <>
      <Row label="読札（上の句）">
        <Segmented ariaLabel={`${prefix} 読札の表記`} value={value.yomiKana} options={KANA_OPTIONS} onChange={v => onChange({ yomiKana: v })} />
      </Row>
      <Row label="取札（下の句）">
        <Segmented ariaLabel={`${prefix} 取札の表記`} value={value.toriKana} options={KANA_OPTIONS} onChange={v => onChange({ toriKana: v })} />
      </Row>
      <Row label="決まり字" hint="かな表示のときに赤く示します">
        <Segmented ariaLabel={`${prefix} 決まり字`} value={value.kimariji} options={ONOFF_OPTIONS} onChange={v => onChange({ kimariji: v })} />
      </Row>
    </>
  );
}

// =============================================================================
// ページ
// =============================================================================

export function SettingsPage() {
  const { settings, updateTenarai, updateKeiko, resetAll } = useDisplaySettings();
  const { tenarai, keiko } = settings;
  const samplePoem = useMemo(() => getAllPoemsSync()[0], []);

  const isDefault = JSON.stringify(settings) === JSON.stringify(DEFAULT_DISPLAY_SETTINGS);

  const handleReset = () => {
    if (confirm('表示設定を初期値に戻しますか？')) resetAll();
  };

  return (
    <div className="karuta-container py-2 space-y-3">
      <div className="px-1">
        <h1 className="text-lg font-bold text-gray-800">表示設定</h1>
        <p className="text-xs text-gray-500 mt-1">
          ページを開いたときの表示を決めます。変更はすぐに保存され、この端末で使われます。
          各ページのボタンで、その場だけ切り替えることもできます。
        </p>
      </div>

      <Section title="手習" description="札をめくって覚えるページ">
        <CardRows prefix="手習" value={tenarai} onChange={updateTenarai} />
        <Row label="最初に見せる面" hint="札をタップするともう一方の面に">
          <Segmented
            ariaLabel="手習 最初に見せる面"
            value={tenarai.flipStart}
            options={[
              { value: 'tori', label: '下の句' },
              { value: 'yomi', label: '上の句' },
            ]}
            onChange={v => updateTenarai({ flipStart: v })}
          />
        </Row>
        <Row label="表示枚数（スマホ）">
          <Segmented
            ariaLabel="手習 表示枚数（スマホ）"
            value={tenarai.countMobile}
            options={COUNT_OPTIONS}
            onChange={v => updateTenarai({ countMobile: v })}
          />
        </Row>
        <Row label="表示枚数（PC）" hint="タブレットも含む">
          <Segmented
            ariaLabel="手習 表示枚数（PC）"
            value={tenarai.count}
            options={COUNT_OPTIONS}
            onChange={v => updateTenarai({ count: v })}
          />
        </Row>
        <Row label="検索・表示切替欄（スマホ）" hint="隠しても「検索・表示」ボタンで開けます">
          <Segmented
            ariaLabel="手習 検索・表示切替欄（スマホ）"
            value={tenarai.panelMobile}
            options={[
              { value: false, label: '隠す' },
              { value: true, label: '表示' },
            ]}
            onChange={v => updateTenarai({ panelMobile: v })}
          />
        </Row>

        {/* プレビュー */}
        {samplePoem && (
          <div className="flex items-center gap-4 py-3">
            <div className="w-24 shrink-0">
              <KarutaCard
                key={`${tenarai.flipStart}-${tenarai.yomiKana}-${tenarai.toriKana}`}
                poem={samplePoem}
                mode="flip"
                flipStart={tenarai.flipStart}
                showYomiKana={tenarai.yomiKana}
                showToriKana={tenarai.toriKana}
                showKimariji={tenarai.kimariji}
              />
            </div>
            <p className="text-xs text-gray-400">
              プレビュー：手習ではこの表示で始まります。札をタップでめくれます。
            </p>
          </div>
        )}
      </Section>

      <Section title="稽古" description="12枚から札を取る練習">
        <CardRows prefix="稽古" value={keiko} onChange={updateKeiko} />
      </Section>

      <p className="text-xs text-gray-400 px-1">
        歌合（公式競技・級位検定）は条件をそろえるため、この設定の対象外です。
      </p>

      <div className="flex justify-center pt-1 pb-4">
        <button
          onClick={handleReset}
          disabled={isDefault}
          className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-40 disabled:hover:text-gray-500 px-3 py-1.5"
        >
          初期値に戻す
        </button>
      </div>
    </div>
  );
}
