import { useState, useEffect, useCallback } from 'react';

interface ViewportCardSize {
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

interface UseViewportCardSizeOptions {
  /** ヘッダー高さ (px) - デフォルト: 40 */
  headerHeight?: number;
  /** コントロールパネル高さ (px) - デフォルト: 100 */
  controlPanelHeight?: number;
  /** 下部マージン (px) - デフォルト: 16 */
  bottomMargin?: number;
  /** カードの縦横比 (height/width) - デフォルト: 73/52 */
  aspectRatio?: number;
  /** グリッドのギャップ (px) - デフォルト: 4 */
  gridGap?: number;
  /** グリッドのパディング (px) - デフォルト: 4 */
  gridPadding?: number;
  /** 最小カード幅 (px) - デフォルト: 60 */
  minCardWidth?: number;
  /** 最大カード幅 (px) - デフォルト: 200 */
  maxCardWidth?: number;
}

const CARD_ASPECT_RATIO = 73 / 52; // 縦:横 = 73:52

/**
 * ビューポートサイズに基づいて最適なカードサイズを計算するフック
 *
 * @example
 * const { gridMaxWidth, cardWidth, cardHeight } = useViewportCardSize();
 *
 * @example
 * const { gridMaxWidth } = useViewportCardSize({
 *   headerHeight: 40,
 *   controlPanelHeight: 80,
 * });
 */
export function useViewportCardSize(options: UseViewportCardSizeOptions = {}): ViewportCardSize {
  const {
    headerHeight = 40,
    controlPanelHeight = 100,
    bottomMargin = 16,
    aspectRatio = CARD_ASPECT_RATIO,
    gridGap = 4,
    gridPadding = 4,
    minCardWidth = 60,
    maxCardWidth = 200,
  } = options;

  const calculateSize = useCallback((): ViewportCardSize => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;

    // グリッドレイアウト: 横向き=4×3, 縦向き=3×4
    const columns = isLandscape ? 4 : 3;
    const rows = isLandscape ? 3 : 4;

    // 利用可能な高さを計算
    const availableHeight = viewportHeight - headerHeight - controlPanelHeight - bottomMargin;

    // 利用可能な幅を計算（パディングを考慮）
    const maxAvailableWidth = Math.min(viewportWidth - 16, 800); // 左右8pxマージン、最大800px

    // 高さベースでカードサイズを計算
    const totalVerticalGap = gridGap * (rows - 1) + gridPadding * 2;
    const maxCardHeightFromHeight = (availableHeight - totalVerticalGap) / rows;
    const cardWidthFromHeight = maxCardHeightFromHeight / aspectRatio;

    // 幅ベースでカードサイズを計算
    const totalHorizontalGap = gridGap * (columns - 1) + gridPadding * 2;
    const maxCardWidthFromWidth = (maxAvailableWidth - totalHorizontalGap) / columns;

    // 高さと幅の制約のうち、小さい方を採用
    let cardWidth = Math.min(cardWidthFromHeight, maxCardWidthFromWidth);

    // 最小/最大制約を適用
    cardWidth = Math.max(minCardWidth, Math.min(maxCardWidth, cardWidth));

    const cardHeight = cardWidth * aspectRatio;

    // グリッド幅を計算
    const gridMaxWidth = cardWidth * columns + gridGap * (columns - 1) + gridPadding * 2;

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
  }, [headerHeight, controlPanelHeight, bottomMargin, aspectRatio, gridGap, gridPadding, minCardWidth, maxCardWidth]);

  const [size, setSize] = useState<ViewportCardSize>(calculateSize);

  useEffect(() => {
    const handleResize = () => {
      setSize(calculateSize());
    };

    // 初回計算
    handleResize();

    // リサイズイベントをリッスン
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [calculateSize]);

  return size;
}

/**
 * CSS custom propertiesとしてサイズを適用するユーティリティ
 */
export function applyCardSizeToCSS(size: ViewportCardSize): void {
  const root = document.documentElement;
  root.style.setProperty('--karuta-grid-max-width', `${size.gridMaxWidth}px`);
  root.style.setProperty('--karuta-card-width', `${size.cardWidth}px`);
  root.style.setProperty('--karuta-card-height', `${size.cardHeight}px`);
}
