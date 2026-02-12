/**
 * デザイントークン定義
 *
 * 参照: 原則24 - アカデミック・スタイルの「簡潔・余白・タイポ中心・節度あるアクセント」
 *
 * 使用方法:
 * - Tailwind CSS クラスで直接使用: `bg-karuta-tansei`, `text-karuta-accent`
 * - このファイルは設計ドキュメントとして参照
 */

// ========================================
// カラーパレット
// ========================================
export const colors = {
  // プライマリ（淡青）- メインUI、ボタン、リンク
  tansei: '#196AAB',
  tanseiHover: '#155a96',
  tanseiLight: '#e3f2fd',

  // アクセント（黄）- 決まり字ハイライト、強調
  accent: '#FFCB05',
  accentHover: '#e5b600',
  accentLight: '#fffde7',

  // 競技かるた（深紅）- 取札、エラー、警告
  red: '#c62828',
  redHover: '#b71c1c',
  redLight: '#ffebee',

  // ニュートラル
  black: '#212121',
  gray900: '#212121',
  gray800: '#424242',
  gray700: '#616161',
  gray600: '#757575',
  gray500: '#9e9e9e',
  gray400: '#bdbdbd',
  gray300: '#e0e0e0',
  gray200: '#eeeeee',
  gray100: '#f5f5f5',
  gray50: '#fafafa',
  white: '#ffffff',

  // セマンティック
  success: '#2e7d32',
  successLight: '#e8f5e9',
  error: '#c62828',
  errorLight: '#ffebee',
} as const;

// ========================================
// タイポグラフィ
// ========================================
export const typography = {
  fontFamily: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    serif: "Georgia, 'Yu Mincho', 'YuMincho', serif",
    mincho: "'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

// ========================================
// スペーシング
// ========================================
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
} as const;

// ========================================
// UI固定ルール（原則）
// ========================================
export const uiRules = {
  // 原則03: 札枚数は全モード12枚固定
  cardCount: 12,

  // 原則04: グリッドは4×3または3×4（向きで切替）
  grid: {
    landscape: { cols: 4, rows: 3 },
    portrait: { cols: 3, rows: 4 },
  },

  // 原則05: 札比率は縦:横=73:52
  cardAspectRatio: '52 / 73',

  // タッチターゲット最小サイズ
  touchTargetMin: 44,

  // PC最大幅
  maxWidth: 1200,

  // コントロールバーボタン順序
  controlBarOrder: ['ひらがな', '決まり字', '覚えた', 'シャッフル'],
} as const;

// ========================================
// トグルボタンのバリアント（インラインスタイル用）
// ========================================
export const toggleVariants = {
  // デフォルト（非選択）
  default: {
    bg: colors.white,
    text: colors.gray900,
    border: colors.gray200,
    hoverBg: colors.gray100,
  },
  // プライマリ選択（淡青）
  primary: {
    bg: colors.tansei,
    text: colors.white,
    border: colors.tansei,
    hoverBg: colors.tanseiHover,
  },
  // アクセント選択（黄）
  accent: {
    bg: colors.accent,
    text: colors.gray900,
    border: colors.accent,
    hoverBg: colors.accentHover,
  },
  // 除外モード（赤系）
  exclude: {
    bg: '#fef2f2', // red-50
    text: '#b91c1c', // red-700
    border: '#fecaca', // red-200
    hoverBg: '#fee2e2', // red-100
  },
  // 優先モード（緑系）
  prioritize: {
    bg: '#f0fdf4', // green-50
    text: '#15803d', // green-700
    border: '#bbf7d0', // green-200
    hoverBg: '#dcfce7', // green-100
  },
  // 無効
  disabled: {
    bg: colors.gray100,
    text: colors.gray400,
    border: colors.gray200,
    hoverBg: colors.gray100,
  },
} as const;

export type ToggleVariant = keyof typeof toggleVariants;

// ========================================
// 選択ボタン（複数選択可能）のバリアント
// ========================================
/**
 * ON/OFFボタンのデザインルール
 *
 * 【OFF状態】
 * - 背景: 白または薄いグレー
 * - 文字: 濃いグレー（gray-700以上）
 * - ボーダー: 見える程度の薄いグレー
 *
 * 【ON状態】
 * - 背景: 濃い色（視認性確保）
 * - 文字: 背景とのコントラスト比4.5:1以上
 * - ボーダー: 背景色と同じまたは濃い色
 *
 * 【ホバー】
 * - 現在の状態から少し濃く/明るく変化
 */
export const selectButtonVariants = {
  // デフォルト（OFF状態）- チップ/バッジ風
  off: {
    bg: colors.gray100,
    text: colors.gray700,
    border: colors.gray200,
    hoverBg: colors.gray200,
  },
  // プライマリ選択（ON状態）- 淡青
  onPrimary: {
    bg: colors.tansei,
    text: colors.white,
    border: colors.tansei,
    hoverBg: colors.tanseiHover,
  },
  // アクセント選択（ON状態）- 黄
  onAccent: {
    bg: colors.accent,
    text: colors.gray900,
    border: colors.accent,
    hoverBg: colors.accentHover,
  },
  // 競技選択（ON状態）- 深紅
  onRed: {
    bg: colors.red,
    text: colors.white,
    border: colors.red,
    hoverBg: colors.redHover,
  },
} as const;

export type SelectButtonVariant = keyof typeof selectButtonVariants;
