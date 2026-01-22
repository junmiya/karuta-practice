import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface CardSize {
  /** グリッドの最大幅 (px) */
  gridMaxWidth: number;
  /** カード1枚の幅 (px) */
  cardWidth: number;
  /** カード1枚の高さ (px) */
  cardHeight: number;
  /** 列数 */
  columns: number;
  /** 行数 */
  rows: number;
  /** 横向きかどうか */
  isLandscape: boolean;
  /** ビューポート幅 */
  viewportWidth: number;
  /** ビューポート高さ */
  viewportHeight: number;
}

interface CardSizeContextValue {
  cardSize: CardSize;
  /** ヘッダーとコントロールパネルの高さを設定 */
  setLayoutHeights: (headerHeight: number, controlPanelHeight: number) => void;
}

const CARD_ASPECT_RATIO = 73 / 52; // 縦:横 = 73:52
const DEFAULT_HEADER_HEIGHT = 40;
const DEFAULT_CONTROL_PANEL_HEIGHT = 100;
const BOTTOM_MARGIN = 16;
const GRID_GAP = 4;
const GRID_PADDING = 4;
const MIN_CARD_WIDTH = 60;
const MAX_CARD_WIDTH = 180;
const SMARTPHONE_MAX_WIDTH = 640; // スマートフォンの最大幅

const defaultCardSize: CardSize = {
  gridMaxWidth: 600,
  cardWidth: 100,
  cardHeight: 140,
  columns: 4,
  rows: 3,
  isLandscape: true,
  viewportWidth: 800,
  viewportHeight: 600,
};

const CardSizeContext = createContext<CardSizeContextValue>({
  cardSize: defaultCardSize,
  setLayoutHeights: () => {},
});

export function useCardSize() {
  return useContext(CardSizeContext);
}

interface CardSizeProviderProps {
  children: ReactNode;
}

export function CardSizeProvider({ children }: CardSizeProviderProps) {
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const [controlPanelHeight, setControlPanelHeight] = useState(DEFAULT_CONTROL_PANEL_HEIGHT);
  const [cardSize, setCardSize] = useState<CardSize>(defaultCardSize);

  const setLayoutHeights = useCallback((header: number, control: number) => {
    setHeaderHeight(header);
    setControlPanelHeight(control);
  }, []);

  const calculateSize = useCallback((): CardSize => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;
    const isSmartphone = viewportWidth <= SMARTPHONE_MAX_WIDTH;

    // グリッドレイアウト:
    // - スマートフォン: 向きに応じて切替（横向き=4×3, 縦向き=3×4）
    // - タブレット/PC: 常に4×3（横4列、縦3行）
    const columns = isSmartphone ? (isLandscape ? 4 : 3) : 4;
    const rows = isSmartphone ? (isLandscape ? 3 : 4) : 3;

    // 利用可能な高さを計算
    const availableHeight = viewportHeight - headerHeight - controlPanelHeight - BOTTOM_MARGIN;

    // 利用可能な幅を計算（パディングを考慮）
    const maxAvailableWidth = Math.min(viewportWidth - 16, 800); // 左右8pxマージン、最大800px

    // 高さベースでカードサイズを計算
    const totalVerticalGap = GRID_GAP * (rows - 1) + GRID_PADDING * 2;
    const maxCardHeightFromHeight = (availableHeight - totalVerticalGap) / rows;
    const cardWidthFromHeight = maxCardHeightFromHeight / CARD_ASPECT_RATIO;

    // 幅ベースでカードサイズを計算
    const totalHorizontalGap = GRID_GAP * (columns - 1) + GRID_PADDING * 2;
    const maxCardWidthFromWidth = (maxAvailableWidth - totalHorizontalGap) / columns;

    // 高さと幅の制約のうち、小さい方を採用
    let cardWidth = Math.min(cardWidthFromHeight, maxCardWidthFromWidth);

    // 最小/最大制約を適用
    cardWidth = Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, cardWidth));

    const cardHeight = cardWidth * CARD_ASPECT_RATIO;

    // グリッド幅を計算
    const gridMaxWidth = cardWidth * columns + GRID_GAP * (columns - 1) + GRID_PADDING * 2;

    return {
      gridMaxWidth,
      cardWidth,
      cardHeight,
      columns,
      rows,
      isLandscape,
      viewportWidth,
      viewportHeight,
    };
  }, [headerHeight, controlPanelHeight]);

  // サイズ計算とCSS適用
  useEffect(() => {
    const updateSize = () => {
      const size = calculateSize();
      setCardSize(size);

      // CSS custom propertiesを適用
      const root = document.documentElement;
      root.style.setProperty('--karuta-grid-max-width', `${size.gridMaxWidth}px`);
      root.style.setProperty('--karuta-card-width', `${size.cardWidth}px`);
      root.style.setProperty('--karuta-card-height', `${size.cardHeight}px`);
      root.style.setProperty('--karuta-columns', `${size.columns}`);
      root.style.setProperty('--karuta-rows', `${size.rows}`);
      // ページコンテンツ幅も札グリッドと統一
      root.style.setProperty('--karuta-content-width', `${size.gridMaxWidth}px`);
    };

    // 初回計算
    updateSize();

    // リサイズイベントをリッスン
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [calculateSize]);

  return (
    <CardSizeContext.Provider value={{ cardSize, setLayoutHeights }}>
      {children}
    </CardSizeContext.Provider>
  );
}
