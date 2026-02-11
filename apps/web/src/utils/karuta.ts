/**
 * Karuta text utilities
 */

/**
 * Split text into 3 roughly equal lines for vertical display on karuta cards
 */
export function splitInto3Lines(text: string): string[] {
  const len = text.length;
  const partLen = Math.ceil(len / 3);
  return [
    text.slice(0, partLen),
    text.slice(partLen, partLen * 2),
    text.slice(partLen * 2),
  ].filter(s => s.length > 0);
}

/**
 * Split text into fixed-length lines (for torifuda display)
 * @param text - Text to split
 * @param charsPerLine - Number of characters per line (default: 5)
 */
export function splitIntoFixedLines(text: string, charsPerLine = 5): string[] {
  const cleaned = removeSpaces(text);
  const lines: string[] = [];
  for (let i = 0; i < cleaned.length; i += charsPerLine) {
    lines.push(cleaned.slice(i, i + charsPerLine));
  }
  return lines;
}

/**
 * Remove all whitespace from text (including full-width spaces)
 */
export function removeSpaces(text: string): string {
  return text.replace(/[\s　]+/g, '');
}

/**
 * Get accuracy color class based on percentage
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'bg-green-500';
  if (accuracy >= 70) return 'bg-yellow-500';
  if (accuracy >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Get accuracy text color class based on percentage
 */
export function getAccuracyTextColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-600';
  if (accuracy >= 70) return 'text-yellow-600';
  if (accuracy >= 50) return 'text-orange-600';
  return 'text-red-600';
}
