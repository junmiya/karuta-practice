import type { Poem } from '@/types/poem';
// Import local seed data for MVP (no Firebase required)
import poemsData from '@/data/poems.json';

// Type assertion for imported JSON
const poems: Poem[] = poemsData as Poem[];

/**
 * Get all poems from local data
 */
export async function getAllPoems(): Promise<Poem[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(poems), 100);
  });
}

/**
 * Get all poems synchronously
 */
export function getAllPoemsSync(): Poem[] {
  return poems;
}

/**
 * Get a poem by its ID
 */
export function getPoemById(poemId: string): Poem | undefined {
  return poems.find(p => p.poemId === poemId);
}

/**
 * Get a random selection of N poems with optional filter
 */
export function getRandomPoems(count: number, filter?: { kimarijiCounts?: number[]; poemRanges?: { start: number; end: number }[] }): Poem[] {
  let filtered = poems;

  // Filter by kimarijiCount if specified
  if (filter?.kimarijiCounts && filter.kimarijiCounts.length > 0) {
    filtered = filtered.filter(p => filter.kimarijiCounts!.includes(p.kimarijiCount));
  }

  // Filter by poem range (order) if specified
  if (filter?.poemRanges && filter.poemRanges.length > 0) {
    filtered = filtered.filter(p =>
      filter.poemRanges!.some(range => p.order >= range.start && p.order <= range.end)
    );
  }

  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get count of poems by kimarijiCount
 */
export function getPoemCountByKimariji(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const poem of poems) {
    counts[poem.kimarijiCount] = (counts[poem.kimarijiCount] || 0) + 1;
  }
  return counts;
}
